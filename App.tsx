
import React, { useRef } from 'react';
import { useTravelBuddy } from './hooks/useTravelBuddy';
import type { TranscriptEntry } from './types';
import { Icon } from './components/Icon';

const CameraIcon = () => <Icon path="M12 12.75a3 3 0 100-6 3 3 0 000 6z" />;
const VideoCameraIcon = () => <Icon path="M2.25 4.5A2.25 2.25 0 014.5 2.25h15A2.25 2.25 0 0121.75 4.5v15a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 19.5v-15zM4.5 4.5v.75A.75.75 0 015.25 6h13.5a.75.75 0 01.75-.75V4.5a.75.75 0 00-.75-.75H5.25a.75.75 0 00-.75.75zM19.5 7.5h-15v12h15v-12z" />;
const StopIcon = () => <Icon path="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />;
const MicIcon = () => <Icon path="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6zM10.5 5.25a.75.75 0 00-1.5 0v.141a4.5 4.5 0 007.5 0V5.25a.75.75 0 00-1.5 0v.203a3 3 0 01-4.5 0V5.25z" />;
const UserIcon = () => <Icon path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />;
const SparklesIcon = () => <Icon path="M10.788 3.212a.75.75 0 00-1.06 1.06L11.438 6H9.75a.75.75 0 000 1.5h1.688L9.712 9.288a.75.75 0 101.06 1.06l1.712-1.788V10.5a.75.75 0 001.5 0v-1.938l1.712 1.788a.75.75 0 101.06-1.06L14.25 7.5H15.938a.75.75 0 000-1.5h-1.688l1.712-1.788a.75.75 0 10-1.06-1.06L12.75 4.938V3a.75.75 0 00-1.5 0v1.938L10.788 3.212zM9 12.75a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H9zM10.06 15.44a.75.75 0 10-1.06-1.06l-.75.75a.75.75 0 001.06 1.06l.75-.75zM12.75 15h.75a.75.75 0 000-1.5h-.75a.75.75 0 000 1.5zM14.25 12.75a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM16.06 14.38a.75.75 0 10-1.06-1.06l-.75.75a.75.75 0 101.06 1.06l.75-.75zM12 16.5a.75.75 0 00-.75.75v.75a.75.75 0 001.5 0v-.75a.75.75 0 00-.75-.75zM9.188 18.612a.75.75 0 10-1.06-1.06l-.75.75a.75.75 0 001.06 1.06l.75-.75zM12.75 18a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15.188 18.612a.75.75 0 10-1.06-1.06l-.75.75a.75.75 0 101.06 1.06l.75-.75z"/>;

const App: React.FC = () => {
    const { 
      isSessionActive, 
      isConnecting, 
      error, 
      transcripts, 
      currentInput,
      currentOutput,
      startSession, 
      stopSession 
    } = useTravelBuddy();
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleStart = () => {
        if (videoRef.current && canvasRef.current) {
            startSession(videoRef.current, canvasRef.current);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
            <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-4 h-[calc(100vh-2rem)]">
                
                {/* Camera and Controls */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
                    <div className="relative flex-1 bg-black flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />

                        {!isSessionActive && !isConnecting && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                                <CameraIcon />
                                <h2 className="text-2xl font-bold mt-4">AI Travel Buddy</h2>
                                <p className="text-gray-400 mt-2 max-w-sm">
                                    Point your camera at a landmark and start a conversation to learn about its history and culture.
                                </p>
                            </div>
                        )}
                        {isConnecting && (
                             <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                                <p className="mt-4 text-lg">Connecting...</p>
                             </div>
                        )}
                    </div>
                    <div className="bg-gray-800/80 p-4 border-t border-gray-700 flex items-center justify-center">
                       {!isSessionActive ? (
                            <button
                                onClick={handleStart}
                                disabled={isConnecting}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white font-semibold text-lg flex items-center gap-3 transition-all duration-300 transform hover:scale-105"
                            >
                                <VideoCameraIcon />
                                {isConnecting ? 'Starting Tour...' : 'Start Guided Tour'}
                            </button>
                        ) : (
                            <button
                                onClick={stopSession}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full text-white font-semibold text-lg flex items-center gap-3 transition-all duration-300 transform hover:scale-105"
                            >
                                <StopIcon />
                                End Tour
                            </button>
                        )}
                    </div>
                </div>

                {/* Transcription Panel */}
                <div className="w-full md:w-1/3 flex flex-col bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4 p-2 border-b border-gray-700">
                      <MicIcon />
                      <h2 className="text-xl font-bold">Live Conversation</h2>
                    </div>

                    {error && (
                      <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">
                        <p className="font-semibold">Error</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {transcripts.map((entry) => (
                            <TranscriptItem key={entry.id} entry={entry} />
                        ))}
                         {currentInput && <TranscriptItem entry={{id: -1, speaker: 'You', text: currentInput}} isPartial={true} />}
                         {currentOutput && <TranscriptItem entry={{id: -2, speaker: 'Travel Buddy', text: currentOutput}} isPartial={true} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TranscriptItemProps {
    entry: TranscriptEntry;
    isPartial?: boolean;
}

const TranscriptItem: React.FC<TranscriptItemProps> = ({ entry, isPartial = false }) => {
    const isUser = entry.speaker === 'You';
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
             {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <SparklesIcon />
                </div>
            )}
            <div className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2 ${isUser ? 'bg-gray-700 rounded-br-none' : 'bg-blue-900/50 rounded-bl-none'}`}>
                <p className={`font-bold text-sm ${isUser ? 'text-gray-300' : 'text-blue-300'}`}>{entry.speaker}</p>
                <p className={`text-white ${isPartial ? 'opacity-60' : ''}`}>{entry.text}</p>
            </div>
             {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon />
                </div>
            )}
        </div>
    );
};


export default App;
