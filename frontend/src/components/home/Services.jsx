import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiHeart, FiFileText, FiActivity, FiUsers } from 'react-icons/fi';
import API from '../../api/axios';

const gradients = [
  'from-emerald-500 to-emerald-600',
  'from-green-500 to-emerald-600',
  'from-teal-500 to-emerald-600',
  'from-emerald-500 to-green-600',
];

export default function Services() {
  const [s, setS] = useState({});

  useEffect(() => {
    API.get('/settings').then((res) => setS(res.data.settings || {})).catch(() => {});
  }, []);

  const icons = [FiHeart, FiFileText, FiActivity, FiUsers];
  const services = [1, 2, 3, 4].map((i) => ({
    icon: icons[i - 1],
    title: s[`service_${i}_title`] || '',
    desc: s[`service_${i}_desc`] || '',
  }));

  return (
    <section className="py-20 md:py-28 bg-emerald-50/40">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-600 text-xs font-bold tracking-widest uppercase mb-3"
          >
            خدمات
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900"
          >
            خدمات درمانی
          </motion.h2>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {services.map((sv, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl p-6 border border-emerald-100/50 shadow-sm hover:shadow-emerald-100/50 hover:shadow-lg transition-all duration-300"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center mb-4 shadow-lg`}
              >
                <sv.icon className="text-white" size={20} />
              </motion.div>
              <h3 className="font-bold text-slate-800 mb-1 text-sm">{sv.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{sv.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
