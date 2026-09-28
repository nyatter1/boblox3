import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';

interface AppSplashScreenProps {
  onComplete?: () => void;
  durationMs?: number;
}

export default function AppSplashScreen({
  onComplete,
  durationMs = 1600,
}: AppSplashScreenProps) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Fill the progress bar smoothly
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 15;
      });
    }, 180);

    // Trigger fade-out
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, durationMs);

    // Hide completely and notify parent
    const hideTimer = setTimeout(() => {
      setHidden(true);
      onComplete?.();
    }, durationMs + 700);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [durationMs, onComplete]);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0c0915] select-none transition-all duration-700 ease-out ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #26174a 0%, #110b24 50%, #0c0915 100%)',
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-6 text-center px-4">
        {/* Glowing Logo Container */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-purple-600/30 rounded-full blur-2xl animate-pulse" />
          <img
            src={logoImg}
            alt="BoBlox"
            className="relative w-44 sm:w-56 md:w-64 h-auto object-contain drop-shadow-[0_10px_25px_rgba(168,85,247,0.4)] animate-bounce duration-1000"
            style={{ animationDuration: '2s' }}
          />
        </div>

        {/* Loading Progress Bar */}
        <div className="w-48 sm:w-56 space-y-2">
          <div className="h-1.5 w-full bg-purple-950/80 rounded-full overflow-hidden border border-purple-500/20">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_rgba(168,85,247,0.8)]"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-purple-300/80 tracking-widest uppercase animate-pulse">
            Loading BoBlox...
          </p>
        </div>
      </div>
    </div>
  );
}
