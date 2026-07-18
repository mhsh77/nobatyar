import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !password) {
      setError('موبایل و رمز عبور را وارد کنید');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await login(mobile, password);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col">
      <header className="p-4 lg:p-6">
        <Link to="/" className="text-medical-600 hover:text-medical-700 flex items-center gap-2">
          <span>←</span>
          <span>صفحه اصلی</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-4xl">🔐</span>
            <h2 className="text-xl font-bold text-gray-800 mt-2">ورود</h2>
            <p className="text-sm text-gray-400 mt-1">پزشک / منشی</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">شماره موبایل</label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="input-field"
                placeholder="مثال: 09120000001"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">رمز عبور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="رمز عبور"
                dir="ltr"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
