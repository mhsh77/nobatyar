import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.viracoai.net:5000';

const Star = ({ filled }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-amber-400' : 'text-gray-500/30'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const QuoteIcon = () => (
  <svg className="w-6 h-6 text-emerald-500/20 absolute top-4 left-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z"/>
  </svg>
);

export default function TestimonialsSection() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/feedback/list?per_page=15`)
      .then(r => r.json())
      .then(d => setResponses(d.responses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || responses.length === 0) return null;

  return (
    <section className="py-20 md:py-24 bg-gradient-to-b from-emerald-900 via-emerald-950 to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-emerald-800/50 text-emerald-300 text-xs font-bold rounded-full mb-4 border border-emerald-700/50 backdrop-blur-sm">
            نظرات مراجعین
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">تجربه مراجعین</h2>
          <p className="text-emerald-200/50 text-sm max-w-lg mx-auto">
            آنچه مراجعین درباره جلسات درمانی با دکتر مرادی می‌گویند
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {responses.map((r, i) => (
            <div
              key={r.id}
              className="group bg-white/[0.04] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all duration-500 relative"
            >
              <QuoteIcon />

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-emerald-900/30 shrink-0">
                  {r.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.name}</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => <Star key={s} filled={s <= r.rating} />)}
                  </div>
                </div>
              </div>

              <p className="text-sm text-emerald-100/60 leading-relaxed relative z-10">
                &ldquo;{r.content}&rdquo;
              </p>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                <span className="text-emerald-300/40 text-xs">مراجعه کننده</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
