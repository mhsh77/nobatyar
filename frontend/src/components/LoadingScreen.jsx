import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '0.5s' }} />

      {/* Brain icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce" style={{ animationDuration: '1.5s' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l-3-3m3 3l3-3" />
          </svg>
        </div>
        {/* Orbiting rings */}
        <div className="absolute -inset-4 rounded-full border-2 border-emerald-500/20 animate-spin" style={{ animationDuration: '4s' }} />
        <div className="absolute -inset-8 rounded-full border-2 border-emerald-500/10 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
      </div>

      {/* Text */}
      <div className="text-center relative">
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
            در حال بارگذاری
          </span>
        </h1>
        <p className="text-emerald-200/40 text-sm">لطفاً چند لحظه صبر کنید</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
            style={{
              animation: `loadingDot 1.4s ease-in-out ${i * 0.15}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
