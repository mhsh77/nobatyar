import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiUsers, FiCalendar } from 'react-icons/fi';
import API from '../../api/axios';
import { toPersianDigits } from '../../utils/persianDate';

function toNum(v) {
  const s = String(v).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  return parseInt(s, 10) || 0;
}

function Counter({ end, suffix = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const inc = end / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, end]);

  return (
    <span ref={ref} className="text-2xl sm:text-4xl md:text-5xl font-black text-emerald-700 tabular-nums">
      {toPersianDigits(count.toLocaleString())}{suffix}
    </span>
  );
}

export default function Stats() {
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  return (
    <section className="py-16 md:py-20 bg-emerald-50/80">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-4 sm:gap-8"
        >
            {[
              { icon: FiAward, end: toNum(s.stats_years || 12), label: s.stats_years_label || 'سال تجربه' },
              { icon: FiUsers, end: toNum(s.stats_patients || 18500), label: s.stats_patients_label || 'بیمار راضی' },
              { icon: FiCalendar, end: toNum(s.stats_visits || 62000), label: s.stats_visits_label || 'نوبت ویزیت' },
            ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <item.icon className="text-xl sm:text-2xl text-emerald-500 mx-auto mb-2 sm:mb-3" />
              </motion.div>
              <Counter end={item.end} suffix="+" />
              <p className="text-xs md:text-sm text-slate-500 mt-1">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
