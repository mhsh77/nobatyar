import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineMenuAlt3, HiX } from 'react-icons/hi';
import API from '../../api/axios';

const links = [
  { to: '/', label: 'خانه' },
  { to: '/book', label: 'رزرو نوبت' },
  { to: '/survey', label: 'نظرسنجی' },
  { to: '/blog', label: 'وبلاگ' },
  { to: '#contact', label: 'ارتباط', scroll: true },
];

const sidebarVariants = {
  hidden: { x: -300 },
  visible: { x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { x: -300, transition: { duration: 0.25, ease: 'easeIn' } },
};

const itemVariants = {
  hidden: { x: -40, opacity: 0 },
  visible: (i) => ({
    x: 0,
    opacity: 1,
    transition: { delay: 0.15 + i * 0.07, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [doctorName, setDoctorName] = useState('');

  useEffect(() => {
    API.get('/settings').then((res) => {
      if (res.data.settings?.doctor_name) setDoctorName(res.data.settings.doctor_name);
    }).catch(() => {});
  }, []);

  const handleScroll = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/50' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
            <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
            <path d="M20 10v20M10 20h20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M15 15h10v10H15z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.15)" />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <span className={`text-lg font-bold transition-colors ${scrolled ? 'text-teal-700' : 'text-white'}`}>
            {doctorName}
          </span>
        </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              l.scroll ? (
              <button
                key={l.to}
                onClick={() => handleScroll(l.to.slice(1))}
                className={`text-sm tracking-wide transition-colors hover:text-teal-500 text-right ${
                  scrolled ? 'text-gray-600' : 'text-white/80'
                }`}
              >
                {l.label}
              </button>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`text-sm tracking-wide transition-colors hover:text-teal-500 ${
                    scrolled ? 'text-gray-600' : 'text-white/80'
                  }`}
                >
                  {l.label}
                </Link>
              )
            ))}
            <button
              onClick={() => navigate('/login')}
              className={`px-5 py-2 text-sm rounded-xl font-medium transition-all hover:shadow-lg ${
                scrolled
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              ورود
            </button>
          </div>

          <button
            className={`md:hidden ${scrolled ? 'text-gray-700' : 'text-white'}`}
            onClick={() => setOpen(true)}
          >
            <HiOutlineMenuAlt3 size={24} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] md:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 left-0 w-64 h-full bg-white shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <svg viewBox="0 0 36 36" className="w-8 h-8" fill="none">
                    <rect width="36" height="36" rx="9" fill="url(#logo-grad-m)" />
                    <path d="M18 8v20M8 18h20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="logo-grad-m" x1="0" y1="0" x2="36" y2="36">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="font-bold text-teal-700">{doctorName}</span>
                </motion.div>
                <motion.button
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  onClick={() => setOpen(false)}
                >
                  <HiX size={20} />
                </motion.button>
              </div>

              <div className="flex flex-col gap-1">
                {links.map((l, i) => (
                  <motion.div
                    key={l.to}
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {l.scroll ? (
                      <button
                        onClick={() => { setOpen(false); handleScroll(l.to.slice(1)); }}
                        className="block w-full text-right text-gray-600 hover:text-teal-600 py-2.5 px-3 rounded-xl hover:bg-teal-50 transition"
                      >
                        {l.label}
                      </button>
                    ) : (
                      <Link
                        to={l.to}
                        onClick={() => setOpen(false)}
                        className="block text-gray-600 hover:text-teal-600 py-2.5 px-3 rounded-xl hover:bg-teal-50 transition"
                      >
                        {l.label}
                      </Link>
                    )}
                  </motion.div>
                ))}
                <motion.div
                  custom={links.length}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <button
                    onClick={() => { setOpen(false); navigate('/login'); }}
                    className="mt-3 w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700 transition"
                  >
                    ورود
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
