import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { useToast } from '../components/Toast';
import API from '../api/axios';

export default function ChatbotSettings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ enabled: false, prompt: '', title: '', greeting: '', api_key: '' });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get('/chatbot/settings');
      setForm({
        enabled: res.data.enabled || false,
        prompt: res.data.prompt || '',
        title: res.data.title || 'چت با دستیار هوشمند',
        greeting: res.data.greeting || 'سلام! چطور می‌توانم به شما کمک کنم؟',
        api_key: res.data.api_key || '',
      });
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/chatbot/settings', form);
      addToast('تنظیمات ذخیره شد', 'success');
    } catch { addToast('خطا', 'error'); } finally { setSaving(false); }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🤖 چت‌بات هوشمند</h1>
        <p className="text-sm text-gray-400">مدیریت دستیار هوشمند سایت</p>
      </div>

      <div className="card space-y-5">
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer select-none">
          <div>
            <span className="text-sm font-medium text-gray-700">وضعیت چت‌بات</span>
            <p className="text-xs text-gray-400 mt-0.5">{form.enabled ? 'چت‌بات فعال است و در سایت نمایش داده می‌شود' : 'چت‌بات غیرفعال است'}</p>
          </div>
          <div className="relative inline-flex items-center">
            <input type="checkbox" className="sr-only peer" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            <div className={`w-14 h-7 rounded-full transition-all duration-300 ease-in-out after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:shadow-md after:transition-all after:duration-300 peer-checked:after:-translate-x-7 peer-checked:after:border-white cursor-pointer ${
              form.enabled ? 'bg-emerald-600 shadow-inner shadow-emerald-800/20' : 'bg-gray-300'
            }`} />
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">عنوان چت‌بات</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">پیام خوش‌آمدگویی</label>
          <textarea value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} className="input-field" rows={2} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">پرامپت (دستورالعمل هوش مصنوعی)</label>
          <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} className="input-field" rows={5} placeholder="مثال: شما دستیار هوشمند دکتر هستید و به سوالات بیماران پاسخ می‌دهید. پاسخ‌ها باید کوتاه و مفید باشند." />
          <p className="text-xs text-gray-400 mt-1">این متن به عنوان دستورالعمل به هوش مصنوعی داده می‌شود</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">کلید API (API Key)</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              className="input-field flex-1"
              placeholder="sk-..."
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">کلید API سرویس هوش مصنوعی (مثل OpenAI یا OpenRouter)</p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button>
      </div>
    </Layout>
  );
}
