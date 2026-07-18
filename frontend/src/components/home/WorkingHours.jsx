import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import API from '../../api/axios';

export default function WorkingHours() {
  const [days, setDays] = useState([]);
  const [todayIndex, setTodayIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/public/schedule')
      .then((res) => { setDays(res.data.days || []); setTodayIndex(res.data.today_index ?? -1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden" id="hours">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-600 text-xs font-bold tracking-widest uppercase mb-3 flex items-center justify-center gap-2"
          >
            <FiClock /> ساعات حضور
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900"
          >
            برنامه هفتگی
          </motion.h2>
        </div>

        <div className="bg-emerald-50/60 rounded-3xl p-4 md:p-6">
          {loading ? (
            <p className="text-center text-sm text-slate-400 py-8">در حال بارگذاری...</p>
          ) : days.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">برنامه‌ای ثبت نشده</p>
          ) : (
            <div className="space-y-1">
              {days.map((d, i) => {
                const isToday = d.day_index === todayIndex;
                return (
                  <motion.div
                    key={d.day_index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ x: 4 }}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-xl transition-colors cursor-default ${
                      isToday ? 'bg-emerald-100 border border-emerald-300' : 'bg-white hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isToday && (
                        <motion.span
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-emerald-500"
                        />
                      )}
                      <span className={`text-sm md:text-base ${isToday ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                        {d.day_name}
                      </span>
                      {isToday && <span className="text-[10px] text-emerald-500 font-medium">(امروز)</span>}
                    </div>
                    <span className={`text-sm ${d.has_schedule ? 'text-slate-600' : 'text-red-400'}`} dir="ltr">
                      {d.has_schedule ? d.hours : 'تعطیل'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
