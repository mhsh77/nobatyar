import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const patientData = location.state;

  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!patientData) {
      navigate('/book');
      return;
    }
  }, [patientData, navigate]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCodes = [...codes];
    newCodes[index] = value.slice(-1);
    setCodes(newCodes);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp_code = codes.join('');
    if (otp_code.length !== 6) {
      setError('کد تایید باید ۶ رقم باشد');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/otp/verify', {
        ...patientData,
        otp_code,
      });
      navigate('/confirmation', {
        state: { user_id: res.data.user_id, mobile: res.data.mobile },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'کد تایید نامعتبر است');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(120);
    setCodes(['', '', '', '', '', '']);
    setError('');
    try {
      await API.post('/otp/send', {
        full_name: patientData.full_name,
        national_id: patientData.national_id,
        mobile: patientData.mobile,
        underlying_diseases: patientData.underlying_diseases,
      });
    } catch {
      setError('خطا در ارسال مجدد کد');
    }
  };

  if (!patientData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col">
      <header className="p-4 lg:p-6">
        <Link to="/book" className="text-medical-600 hover:text-medical-700 flex items-center gap-2">
          <span>←</span>
          <span>مرحله قبل</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-sm text-center">
          <span className="text-4xl">📱</span>
          <h2 className="text-xl font-bold text-gray-800 mt-2">تایید شماره موبایل</h2>
          <p className="text-gray-500 text-sm mt-1">
            کد تایید به شماره {patientData.mobile} ارسال شد
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-4">{error}</div>
          )}

          <div className="flex justify-center gap-2 mt-6" dir="ltr">
            {codes.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none"
                maxLength={1}
                inputMode="numeric"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn-primary w-full mt-6"
          >
            {loading ? 'در حال بررسی...' : 'تایید'}
          </button>

          <div className="mt-4">
            {timer > 0 ? (
              <p className="text-sm text-gray-400">
                ارسال مجدد تا {timer} ثانیه دیگر
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-medical-600 text-sm hover:underline"
              >
                ارسال مجدد کد
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
