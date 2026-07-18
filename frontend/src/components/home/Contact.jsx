import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMapPin, FiPhone, FiMail, FiClock } from 'react-icons/fi';
import API from '../../api/axios';

export default function Contact() {
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  const items = [
    { icon: FiMapPin, title: 'آدرس مطب', value: s.contact_address || '' },
    { icon: FiPhone, title: 'تلفن تماس', value: s.contact_phone || '', dir: 'ltr' },
    { icon: FiMail, title: 'ایمیل', value: s.contact_email || '', dir: 'ltr' },
    { icon: FiClock, title: 'ساعات کاری', value: s.contact_hours || '' },
  ];

  return (
    <section className="py-20 md:py-28 bg-emerald-50/40 overflow-hidden" id="contact">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-600 text-xs font-bold tracking-widest uppercase mb-3"
          >
            ارتباط
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900"
          >
            تماس با مطب
          </motion.h2>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="grid md:grid-cols-2 gap-4"
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 30, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
              whileHover={{ y: -5, boxShadow: '0 8px 25px rgba(5, 150, 105, 0.08)' }}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-emerald-100/50 shadow-sm transition-all duration-200"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0"
              >
                <item.icon className="text-emerald-600" size={18} />
              </motion.div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                <p className={`text-sm text-slate-400 mt-0.5 ${item.dir || ''}`}>{item.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
