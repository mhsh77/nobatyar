import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiCheckCircle, HiXCircle, HiArrowRight } from 'react-icons/hi';
import SEO from '../components/SEO';
import { formatPersianDate } from '../utils/persianDate';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.viracoai.net:5000';

const SETTINGS_API = `${API_BASE}/api/settings`;
const REGISTER_API = `${API_BASE}/seminar/api/register`;
const SEND_OTP_API = `${API_BASE}/seminar/api/send-otp`;
const VERIFY_OTP_API = `${API_BASE}/seminar/api/verify-otp`;

export default function SeminarRegister() {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [seminarEnabled, setSeminarEnabled] = useState(true);

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    is_student: false, field_of_study: '', semester: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const [otpStep, setOtpStep] = useState('phone');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(SETTINGS_API);
      const d = await res.json();
      const s = d.settings || {};
      setSettings(s);
      setSeminarEnabled(s.seminar_enabled === 'true' || s.seminar_enabled === true);
    } catch { setSeminarEnabled(true); }
    finally { setLoadingSettings(false); }
  };

  const handleSendOtp = async () => {
    if (!otpPhone || otpPhone.length < 10) { setErrors(['لطفاً شماره تماس معتبر وارد کنید']); return; }
    setErrors([]); setOtpLoading(true);
    try {
      const res = await fetch(SEND_OTP_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone }) });
      const d = await res.json();
      if (d.success) { setOtpStep('code'); }
      else { setErrors([d.error || 'خطا در ارسال کد']); }
    } catch { setErrors(['خطا در ارتباط با سرور']); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) { setErrors(['لطفاً کد تایید را وارد کنید']); return; }
    setErrors([]); setOtpLoading(true);
    try {
      const res = await fetch(VERIFY_OTP_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone, code: otpCode }) });
      const d = await res.json();
      if (d.success) { setOtpStep('verified'); setForm(p => ({ ...p, phone: otpPhone })); }
      else { setErrors([d.error || 'کد نامعتبر']); }
    } catch { setErrors(['خطا در ارتباط با سرور']); }
    finally { setOtpLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrors([]); setLoading(true);
    try {
      const res = await fetch(REGISTER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (d.success) setSuccess(true);
      else setErrors(d.errors || ['خطایی رخ داد']);
    } catch { setErrors(['خطا در ارتباط با سرور']); }
    finally { setLoading(false); }
  };

  const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white bg-gray-50/50';
  const seminarDate = settings?.seminar_date ? formatPersianDate(settings.seminar_date) : '';
  const seminarTitle = settings?.seminar_title || 'سمینار تخصصی روانشناسی';

  if (loadingSettings) return <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <SEO title={`${seminarTitle} | دکتر حسین مرادی`} description={`ثبت‌نام ${seminarTitle}`} url="https://moradipsy.ir/seminar" />
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl shadow-emerald-100/50 overflow-hidden">
          <div className="bg-gradient-to-l from-emerald-600 to-teal-600 px-6 py-8 text-white text-center">
            <div className="text-4xl mb-3">📚</div>
            <h1 className="text-xl font-bold">{seminarTitle}</h1>
            <p className="text-emerald-100 text-sm mt-1">دکتر حسین مرادی | روانشناس بالینی</p>
          </div>
          {(seminarDate || settings?.seminar_time || settings?.seminar_location || settings?.seminar_description) && (
            <div className="px-6 pt-6">
              <div className="bg-emerald-50 rounded-xl p-4 space-y-2 text-sm">
                {seminarDate && <div className="flex items-center gap-2 text-gray-700"><span>📅</span><span><strong>تاریخ:</strong> {seminarDate}{settings?.seminar_time ? ` ساعت ${settings.seminar_time}` : ''}</span></div>}
                {settings?.seminar_location && <div className="flex items-center gap-2 text-gray-700"><span>📍</span><span><strong>مکان:</strong> {settings.seminar_location}</span></div>}
                {settings?.seminar_description && <div className="text-gray-600 text-sm leading-relaxed pt-1 border-t border-emerald-100 mt-2">{settings.seminar_description}</div>}
              </div>
            </div>
          )}
          <div className="p-6">
            {!seminarEnabled ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">😔</div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">ثبت‌نام غیرفعال است</h2>
                <p className="text-gray-500 text-sm mb-6">در حال حاضر ثبت‌نام امکان‌پذیر نیست.</p>
                <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"><HiArrowRight className="text-lg" /> بازگشت به صفحه اصلی</Link>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                    <HiCheckCircle className="text-emerald-500 text-6xl mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-gray-800 mb-2">ثبت‌نام با موفقیت انجام شد</h2>
                    <p className="text-gray-500 text-sm mb-6">به زودی با شما تماس خواهیم گرفت.</p>
                    <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"><HiArrowRight className="text-lg" /> بازگشت به صفحه اصلی</Link>
                  </motion.div>
                ) : (
                  <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
                    {errors.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                        <div className="flex items-start gap-2"><HiXCircle className="text-red-400 text-xl mt-0.5 shrink-0" />
                          <ul className="text-red-600 text-sm space-y-1">{errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                        </div>
                      </motion.div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">نام</label>
                        <input name="first_name" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inp} placeholder="نام" required />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">نام خانوادگی</label>
                        <input name="last_name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inp} placeholder="نام خانوادگی" required />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1.5">شماره تماس</label>
                        {otpStep === 'verified' ? (
                          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-700">
                            <span>✅</span><span dir="ltr">{otpPhone}</span>
                            <button type="button" onClick={() => { setOtpStep('phone'); setOtpPhone(''); setOtpCode(''); }} className="mr-auto text-green-600 hover:text-green-700 text-xs">تغییر شماره</button>
                          </div>
                        ) : otpStep === 'code' ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                              <input value={otpCode} onChange={e => setOtpCode(e.target.value)} className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-center outline-none transition-all focus:border-emerald-500 bg-gray-50/50" placeholder="کد تایید" dir="ltr" maxLength={4} />
                              <button type="button" onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length < 4} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">{otpLoading ? '...' : 'تایید'}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input value={otpPhone} onChange={e => setOtpPhone(e.target.value)} className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none transition-all focus:border-emerald-500 bg-gray-50/50" placeholder="0912xxxxxxx" dir="ltr" />
                            <button type="button" onClick={handleSendOtp} disabled={otpLoading || otpPhone.length < 10} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap">{otpLoading ? '...' : 'ارسال کد'}</button>
                          </div>
                        )}
                      </div>
                      {otpStep !== 'verified' && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">ابتدا شماره تماس خود را تایید کنید</div>}
                      <label className="flex items-center gap-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_student} onChange={e => setForm(p => ({ ...p, is_student: e.target.checked }))} className="w-5 h-5 accent-emerald-600 cursor-pointer" />
                        <span className="text-gray-700 text-sm">دانشجو هستم</span>
                      </label>
                      <AnimatePresence>{form.is_student && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="bg-emerald-50/50 rounded-xl p-4 space-y-4">
                            <div><label className="block text-gray-700 text-sm font-medium mb-1.5">رشته تحصیلی</label><input value={form.field_of_study} onChange={e => setForm(p => ({ ...p, field_of_study: e.target.value }))} className={inp} placeholder="مثال: روانشناسی" /></div>
                            <div><label className="block text-gray-700 text-sm font-medium mb-1.5">ترم تحصیلی</label><input value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))} className={inp} placeholder="مثال: ۵" /></div>
                          </div>
                        </motion.div>
                      )}</AnimatePresence>
                    </div>
                    <button type="submit" disabled={loading || otpStep !== 'verified'} className="mt-6 w-full py-3.5 bg-gradient-to-l from-emerald-600 to-teal-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-emerald-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>در حال ثبت‌نام...</span> : 'ثبت‌نام در سمینار'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
        <div className="text-center mt-6"><Link to="/" className="text-gray-400 hover:text-emerald-600 text-sm transition-colors inline-flex items-center gap-1"><HiArrowRight /> بازگشت به صفحه اصلی</Link></div>
      </div>
    </div>
  );
}
