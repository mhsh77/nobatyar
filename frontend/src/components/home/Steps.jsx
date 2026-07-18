import React from 'react';
import { motion } from 'framer-motion';
import { FiEdit, FiSmartphone, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const steps = [
  { icon: FiEdit, title: 'ثبت اطلاعات', desc: 'نام و شماره تماس خود را وارد کنید' },
  { icon: FiSmartphone, title: 'تایید موبایل', desc: 'کد تایید را دریافت کنید' },
  { icon: FiCheckCircle, title: 'دریافت نوبت', desc: 'روز و ساعت مناسب را انتخاب کنید' },
];

export default function Steps() {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-600 text-xs font-bold tracking-widest uppercase mb-3"
          >
            نحوه نوبت‌دهی
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900"
          >
            در سه قدم ساده
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
          <motion.div
            className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-emerald-200"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ transformOrigin: 'right' }}
          />

          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 + 0.2, type: 'spring' }}
              className="text-center relative"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-lg shadow-emerald-200 relative z-10"
              >
                {i + 1}
              </motion.div>
              <h3 className="font-bold text-slate-800 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/book')}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-medium text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
          >
            رزرو نوبت
            <FiArrowLeft size={16} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
