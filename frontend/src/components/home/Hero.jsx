import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowDown, FiArrowLeft } from 'react-icons/fi';
import FloatingIcons from './FloatingIcons';
import { toPersianDigits } from '../../utils/persianDate';
import API from '../../api/axios';

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';

function imgUrl(val) {
  if (!val) return '';
  if (val.startsWith('http')) return val;
  return `${API_BASE}${val}`;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

export default function Hero() {
  const navigate = useNavigate();
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 pt-20">
      <FloatingIcons />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-300/15 via-emerald-200/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-teal-300/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-emerald-400/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDuration: '14s' }} />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-5xl mx-auto px-4 w-full"
      >
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center md:text-right">
            <motion.div variants={item} className="mb-4">
              <span className="inline-block px-4 py-1.5 bg-emerald-400/15 text-emerald-300 text-sm rounded-full border border-emerald-400/20 backdrop-blur-sm">
                {s.hero_badge || 'متخصص بیماری‌های داخلی'}
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-4"
            >
              {s.doctor_name ? s.doctor_name.split(' ')[0] : 'دکتر'}
              <br />
              <span className="text-emerald-400">{s.doctor_name ? s.doctor_name.split(' ').slice(1).join(' ') : 'امیرحسین عبدی'}</span>
            </motion.h1>

            <motion.p variants={item} className="text-base md:text-lg text-white/60 leading-relaxed mb-8">
              {s.hero_description || 'با بیش از ۱۲ سال تجربه در تشخیص و درمان بیماری‌های داخلی، در کنار شما هستیم تا مسیر سلامتی را هموارتر کنیم.'}
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/book')}
                className="group px-8 py-3.5 bg-emerald-400 text-emerald-900 rounded-2xl font-bold text-sm hover:bg-emerald-300 transition-all shadow-xl shadow-emerald-400/20 flex items-center justify-center gap-2"
              >
                رزرو نوبت آنلاین
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3.5 border border-white/20 text-white/80 rounded-2xl text-sm hover:bg-white/5 transition"
              >
                درباره من
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            variants={item}
            className="relative flex justify-center md:justify-end"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src={imgUrl(s.hero_doctor_image) || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=600&fit=crop&q=80'}
                alt=""
                className="w-72 h-80 md:w-80 md:h-96 object-cover rounded-3xl shadow-2xl"
                loading="lazy"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 1.2 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3"
              >
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl"
                >
                  🩺
                </motion.span>
                <div>
                  <p className="font-bold text-sm text-slate-800">{toPersianDigits(s.stats_years || '12')}+ سال</p>
                  <p className="text-xs text-slate-400">{s.stats_years_label || 'تجربه موفق'}</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block align-bottom -mb-px">
          <path d="M0 80L48 73C96 66 192 52 288 46C384 40 480 42 576 52C672 62 768 80 864 76C960 72 1056 56 1152 46C1248 36 1344 30 1392 27L1440 24V80H0Z" fill="#ecfdf5" />
        </svg>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <FiArrowDown className="text-white/30 animate-bounce" size={20} />
      </motion.div>
    </section>
  );
}
