import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../../api/axios';

export default function Footer() {
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  return (
    <footer className="bg-emerald-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🩺</span>
              <span className="text-lg font-bold">{s.doctor_name || ''}</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              {s.doctor_specialty || 'روانشناس بالینی'} — نوبت‌دهی آنلاین
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4">لینک‌ها</h4>
              <div className="flex flex-col gap-2 text-sm text-white/40">
                <Link to="/" className="hover:text-emerald-400 transition">خانه</Link>
                <Link to="/book" className="hover:text-emerald-400 transition">رزرو نوبت</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4">دسترسی</h4>
              <div className="flex flex-col gap-2 text-sm text-white/40">
                <Link to="/login" className="hover:text-emerald-400 transition">ورود پزشک</Link>
                <Link to="/medical-records" className="hover:text-emerald-400 transition">پرونده‌ها</Link>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t border-white/10 pt-6 text-center text-xs text-white/30"
        >
          تمامی حقوق محفوظ است &copy; {s.doctor_name || ''}
        </motion.div>
      </div>
    </footer>
  );
}
