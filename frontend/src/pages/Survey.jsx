import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiCheckCircle, HiXCircle, HiArrowRight } from 'react-icons/hi';
import SEO from '../components/SEO';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

const SEND_OTP = `${API_BASE}/api/feedback/send-otp`;
const VERIFY_OTP = `${API_BASE}/api/feedback/verify-otp`;
const SUBMIT = `${API_BASE}/api/feedback/submit`;

const stars = [1, 2, 3, 4, 5];

export default function Survey() {
  const [step, setStep] = useState('otp');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) { setErrors(['شماره معتبر وارد کنید']); return; }
    setErrors([]); setOtpLoading(true);
    try {
      const res = await fetch(SEND_OTP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const d = await res.json();
      if (d.success) setStep('verify');
      else setErrors([d.error || 'خطا']);
    } catch { setErrors(['خطا در ارتباط']); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) { setErrors(['کد را وارد کنید']); return; }
    setErrors([]); setOtpLoading(true);
    try {
      const res = await fetch(VERIFY_OTP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code: otpCode }) });
      const d = await res.json();
      if (d.success) setStep('form');
      else setErrors([d.error || 'کد نامعتبر']);
    } catch { setErrors(['خطا در ارتباط']); }
    finally { setOtpLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) { setErrors(['نام و متن نظر را وارد کنید']); return; }
    setErrors([]); setSubmitting(true);
    try {
      const res = await fetch(SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, rating, content }) });
      const d = await res.json();
      if (d.success) setSuccess(true);
      else setErrors([d.error || 'خطا']);
    } catch { setErrors(['خطا در ارتباط']); }
    finally { setSubmitting(false); }
  };

  const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white bg-gray-50/50';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <SEO title="نظرسنجی | دکتر حسین مرادی" description="نظر خود را درباره تجربه درمان خود ثبت کنید" url="https://moradipsy.ir/survey" />
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl shadow-emerald-100/50 overflow-hidden">
          <div className="bg-gradient-to-l from-emerald-600 to-teal-600 px-6 py-10 text-white text-center">
            <div className="text-5xl mb-3">💬</div>
            <h1 className="text-xl font-bold">نظرسنجی تجربه درمان</h1>
            <p className="text-emerald-100 text-sm mt-1">دکتر حسین مرادی | روانشناس بالینی</p>
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <HiCheckCircle className="text-emerald-500 text-6xl mx-auto mb-4" />
                  <h2 className="text-lg font-bold text-gray-800 mb-2">نظر شما ثبت شد</h2>
                  <p className="text-gray-500 text-sm mb-6">از بازخورد شما سپاسگزاریم.</p>
                  <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"><HiArrowRight className="text-lg" /> بازگشت به صفحه اصلی</Link>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {errors.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                      <div className="flex items-start gap-2"><HiXCircle className="text-red-400 text-xl mt-0.5 shrink-0" />
                        <ul className="text-red-600 text-sm space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      </div>
                    </motion.div>
                  )}

                  {step === 'otp' && (
                    <div className="space-y-4">
                      <p className="text-gray-500 text-sm">لطفاً شماره تماس خود را وارد کنید تا کد تایید برای شما ارسال شود.</p>
                      <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="0912xxxxxxx" dir="ltr" />
                      <button onClick={handleSendOtp} disabled={otpLoading || phone.length < 10} className="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition disabled:opacity-50">{otpLoading ? '...' : 'ارسال کد تایید'}</button>
                    </div>
                  )}

                  {step === 'verify' && (
                    <div className="space-y-4">
                      <p className="text-gray-500 text-sm">کد تایید به شماره <strong dir="ltr">{phone}</strong> ارسال شد.</p>
                      <input value={otpCode} onChange={e => setOtpCode(e.target.value)} className={`${inp} text-center`} placeholder="کد تایید" dir="ltr" maxLength={4} />
                      <button onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length < 4} className="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition disabled:opacity-50">{otpLoading ? '...' : 'تایید کد'}</button>
                    </div>
                  )}

                  {step === 'form' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">نام و نام خانوادگی</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="نام شما" required />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">امتیاز شما</label>
                        <div className="flex gap-1">
                          {stars.map(s => (
                            <button key={s} type="button" onClick={() => setRating(s)} className={`text-3xl transition ${s <= rating ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                          ))}
                          <span className="text-sm text-gray-400 mr-2 self-center">{rating} از 5</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">تجربه شما</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} className={`${inp} min-h-[120px] resize-y`} placeholder="نظر خود را درباره جلسات درمانی بنویسید..." rows={4} required />
                      </div>
                      <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition disabled:opacity-50">{submitting ? 'در حال ارسال...' : 'ثبت نظر'}</button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <div className="text-center mt-6"><Link to="/" className="text-gray-400 hover:text-emerald-600 text-sm transition-colors inline-flex items-center gap-1"><HiArrowRight /> بازگشت به صفحه اصلی</Link></div>
      </div>
    </div>
  );
}
