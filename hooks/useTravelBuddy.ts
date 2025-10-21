import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ai } from '../services/geminiService';
import { decode, decodeAudioData, encode, blobToBase64 } from '../utils/audioUtils';
import type { TranscriptEntry } from '../types';

const FRAME_RATE = 1; // Send 1 frame per second
const JPEG_QUALITY = 0.7;

export const useTravelBuddy = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error('Error closing session:', e);
        }
    }

    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();

    sessionPromiseRef.current = null;
    streamRef.current = null;
    scriptProcessorRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    nextStartTimeRef.current = 0;
    
    setIsSessionActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = useCallback(async (videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => {
    setError(null);
    setIsConnecting(true);
    setTranscripts([]);
    setCurrentInput('');
    setCurrentOutput('');
    currentInputRef.current = '';
    currentOutputRef.current = '';

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      videoEl.srcObject = streamRef.current;
      videoEl.play();

      // FIX: Cast window to `any` to support `webkitAudioContext` for older browsers.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a friendly and knowledgeable travel guide. When the user shows you a place or landmark through their camera, provide interesting historical and cultural facts about it. Keep your responses concise and engaging.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsSessionActive(true);

            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32767)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
            
            const ctx = canvasEl.getContext('2d');
            frameIntervalRef.current = window.setInterval(() => {
                if (videoEl.readyState >= 2 && ctx) {
                    canvasEl.width = videoEl.videoWidth;
                    canvasEl.height = videoEl.videoHeight;
                    ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                    canvasEl.toBlob(
                        async (blob) => {
                            if (blob) {
                                const base64Data = await blobToBase64(blob);
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({
                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                    });
                                });
                            }
                        }, 'image/jpeg', JPEG_QUALITY
                    );
                }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.serverContent?.inputTranscription) {
                currentInputRef.current += message.serverContent.inputTranscription.text;
                setCurrentInput(currentInputRef.current);
            }
            if (message.serverContent?.outputTranscription) {
                currentOutputRef.current += message.serverContent.outputTranscription.text;
                setCurrentOutput(currentOutputRef.current);
            }
            if (message.serverContent?.turnComplete) {
                const fullInput = currentInputRef.current;
                const fullOutput = currentOutputRef.current;
                setTranscripts(prev => [
                    ...prev,
                    { id: Date.now(), speaker: 'You', text: fullInput },
                    { id: Date.now() + 1, speaker: 'Travel Buddy', text: fullOutput }
                ]);
                currentInputRef.current = '';
                currentOutputRef.current = '';
                setCurrentInput('');
                setCurrentOutput('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio) {
                const audioCtx = outputAudioContextRef.current!;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            if(message.serverContent?.interrupted){
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('An error occurred with the connection.');
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed.');
            stopSession();
          },
        },
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      if (err instanceof Error) {
        setError(`Failed to start: ${err.message}. Please grant camera and microphone permissions.`);
      } else {
        setError('An unknown error occurred.');
      }
      setIsConnecting(false);
    }
  }, [stopSession]);

  return { 
    isSessionActive, 
    isConnecting, 
    error, 
    transcripts, 
    currentInput, 
    currentOutput, 
    startSession, 
    stopSession 
  };
};
