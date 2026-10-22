import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Check, AlertCircle, X, Globe, Sparkles } from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string, suggestedLocation?: string) => void;
  currentText?: string;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onTranscriptComplete,
  currentText = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(currentText);
  const [language, setLanguage] = useState<'en-IN' | 'te-IN' | 'hi-IN'>('en-IN');
  const [isSupported, setIsSupported] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const startListening = () => {
    setPermissionError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('[Speech Recognition] Error:', event.error);
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          // No speech detected, keep listening
        } else {
          setPermissionError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[Speech Recognition] Launch error:', err);
      setPermissionError('Failed to initialize microphone dictation.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleApplyTranscript = () => {
    stopListening();
    
    // Quick heuristic location extraction
    let suggestedLoc: string | undefined = undefined;
    const lower = transcript.toLowerCase();
    const landmarks = ['uppal', 'tarnaka', 'habsiguda', 'banjara hills', 'jubilee hills', 'madhapur', 'gachibowli', 'secunderabad', 'begumpet', 'charminar', 'abids', 'dilsukhnagar', 'koti', 'kukatpally', 'hitec city'];
    for (const lm of landmarks) {
      if (lower.includes(lm)) {
        suggestedLoc = lm.charAt(0).toUpperCase() + lm.slice(1);
        break;
      }
    }

    onTranscriptComplete(transcript, suggestedLoc);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Voice Complaint Dictation</h3>
                <p className="text-xs text-slate-400">Describe road damage hands-free</p>
              </div>
            </div>
            <button
              onClick={() => {
                stopListening();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector */}
          <div className="mt-4 flex items-center justify-between bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Dictation Language:</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { code: 'en-IN', label: 'English' },
                { code: 'te-IN', label: 'తెలుగు' },
                { code: 'hi-IN', label: 'हिन्दी' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    setLanguage(lang.code as any);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    language === lang.code
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback / Permission Alert */}
          {!isSupported && (
            <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Your current browser does not support the Web Speech API. Please type your description manually or use Chrome / Edge / Safari.
              </span>
            </div>
          )}

          {permissionError && (
            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{permissionError}</span>
            </div>
          )}

          {/* Live Mic Animation & Control */}
          <div className="mt-6 flex flex-col items-center justify-center py-4">
            <button
              type="button"
              disabled={!isSupported}
              onClick={isListening ? stopListening : startListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/20'
              }`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <span className="mt-4 text-xs font-semibold text-slate-300">
              {isListening ? 'Listening... Speak clearly into your mic' : 'Click microphone to start speaking'}
            </span>
          </div>

          {/* Transcript Preview Box */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Captured Transcript (Editable)
            </label>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g., 'There is a deep pothole on Main Road near Uppal metro station causing traffic blockage...'"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                stopListening();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyTranscript}
              disabled={!transcript.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Use Transcript in Report</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
