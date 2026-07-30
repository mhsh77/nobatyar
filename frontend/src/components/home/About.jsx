import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle } from 'react-icons/fi';
import API from '../../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

function imgUrl(val) {
  if (!val) return '';
  if (val.startsWith('http')) return val;
  return `${API_BASE}${val}`;
}

export default function About() {
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden" id="story">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative order-2 md:order-1"
          >
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true }}
              className="bg-emerald-50/60 rounded-3xl p-8 md:p-10"
            >
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">
                {s.about_title || 'درباره من'}
              </h3>
              {(s.about_text || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i} className="text-slate-500 leading-relaxed mb-6 text-sm md:text-base">{p}</p>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {['تشخیص تخصصی', 'نسخه نویسی', 'پیگیری درمان', 'مشاوره حضوری'].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <FiCheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
                    <span className="text-sm text-slate-700">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative order-1 md:order-2"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={imgUrl(s.about_clinic_image) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=750&fit=crop&q=80'}
                alt=""
                className="w-full aspect-[4/5] rounded-3xl object-cover shadow-xl"
                loading="lazy"
              />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', delay: 0.6 }}
              className="absolute -bottom-3 -right-3 bg-emerald-600 text-white rounded-2xl shadow-lg p-4 flex items-center gap-3"
            >
              <span className="text-2xl">🏥</span>
              <div>
                <p className="font-bold text-sm">مطب مجهز</p>
                <p className="text-xs text-white/70">استانداردهای روز</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
