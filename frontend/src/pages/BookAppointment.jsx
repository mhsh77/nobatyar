import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import API from '../api/axios';
import { toEnglishDigits } from '../utils/persianDate';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    mobile: '',
    underlying_diseases: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!form.full_name.trim()) return 'نام و نام خانوادگی الزامی است';
    if (!form.national_id.trim()) return 'کد ملی الزامی است';
    if (form.national_id.length < 10) return 'کد ملی باید ۱۰ رقم باشد';
    if (!form.mobile.trim()) return 'شماره موبایل الزامی است';
    if (!/^09\d{9}$/.test(form.mobile)) return 'شماره موبایل نامعتبر است';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/otp/send', form);
      console.log('📱 کد تایید:', res.data.otp_code);
      navigate('/verify', { state: { ...form, expires_in: res.data.expires_in } });
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ارسال کد تایید');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mobile' || name === 'national_id') {
      setForm({ ...form, [name]: toEnglishDigits(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  return (
    <>
      <SEO title="رزرو نوبت آنلاین | دکتر حسین مرادی" description="رزرو نوبت مشاوره روانشناسی به صورت آنلاین" url="https://moradipsy.ir/book" />
      <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col">
      <header className="p-4 lg:p-6">
        <Link to="/" className="text-medical-600 hover:text-medical-700 flex items-center gap-2">
          <span>←</span>
          <span>بازگشت</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">📝</span>
            <h2 className="text-xl font-bold text-gray-800 mt-2">ثبت اطلاعات بیمار</h2>
            <p className="text-sm text-gray-400 mt-1">لطفاً اطلاعات زیر را وارد کنید</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">نام و نام خانوادگی</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className="input-field"
                placeholder="مثال: علی محمدی"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">کد ملی</label>
              <input
                name="national_id"
                value={form.national_id}
                onChange={handleChange}
                className="input-field"
                placeholder="۱۰ رقم"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">شماره موبایل</label>
              <input
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                className="input-field"
                placeholder="مثال: 09123456789"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">بیماری‌های زمینه‌ای (اختیاری)</label>
              <textarea
                name="underlying_diseases"
                value={form.underlying_diseases}
                onChange={handleChange}
                className="input-field"
                placeholder="در صورت وجود بیماری خاص ذکر کنید"
                rows={3}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'در حال ارسال...' : 'دریافت کد تایید'}
            </button>
          </form>
        </div>
      </main>
    </div>
    </>
  );
}
