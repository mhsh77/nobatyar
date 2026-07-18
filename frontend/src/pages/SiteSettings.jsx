import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { useToast } from '../components/Toast';
import API from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';
const imageKeys = ['hero_doctor_image', 'about_clinic_image'];

export default function SiteSettings() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [tab, setTab] = useState('hero');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await API.get('/settings');
      setSettings(res.data.settings || {});
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/settings', settings);
      addToast('تنظیمات ذخیره شد', 'success');
    } catch {
      addToast('خطا در ذخیره', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploading({ ...uploading, [key]: true });
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await API.post(`/settings/upload/${key}`, fd);
      setSettings({ ...settings, [key]: res.data.url });
      addToast('تصویر آپلود شد', 'success');
    } catch {
      addToast('خطا در آپلود تصویر', 'error');
    } finally {
      setUploading({ ...uploading, [key]: false });
    }
  };

  const sections = {
    hero: {
      label: 'بنر اصلی',
      fields: [
        { key: 'doctor_name', label: 'نام دکتر', type: 'text' },
        { key: 'doctor_specialty', label: 'تخصص', type: 'text' },
        { key: 'hero_badge', label: 'برچسب هیرو', type: 'text' },
        { key: 'hero_description', label: 'توضیحات هیرو', type: 'textarea' },
        { key: 'hero_doctor_image', label: 'عکس دکتر', type: 'image' },
      ],
    },
    about: {
      label: 'درباره',
      fields: [
        { key: 'about_title', label: 'عنوان', type: 'text' },
        { key: 'about_text', label: 'متن', type: 'textarea' },
        { key: 'about_clinic_image', label: 'عکس مطب', type: 'image' },
      ],
    },
    stats: {
      label: 'آمار',
      fields: [
        { key: 'stats_years', label: 'تعداد سال‌ها', type: 'text' },
        { key: 'stats_years_label', label: 'برچسب سال', type: 'text' },
        { key: 'stats_patients', label: 'تعداد بیماران', type: 'text' },
        { key: 'stats_patients_label', label: 'برچسب بیماران', type: 'text' },
        { key: 'stats_visits', label: 'تعداد ویزیت', type: 'text' },
        { key: 'stats_visits_label', label: 'برچسب ویزیت', type: 'text' },
      ],
    },
    services: {
      label: 'خدمات',
      fields: [
        { key: 'service_1_title', label: 'عنوان خدمت ۱', type: 'text' },
        { key: 'service_1_desc', label: 'توضیح خدمت ۱', type: 'text' },
        { key: 'service_2_title', label: 'عنوان خدمت ۲', type: 'text' },
        { key: 'service_2_desc', label: 'توضیح خدمت ۲', type: 'text' },
        { key: 'service_3_title', label: 'عنوان خدمت ۳', type: 'text' },
        { key: 'service_3_desc', label: 'توضیح خدمت ۳', type: 'text' },
        { key: 'service_4_title', label: 'عنوان خدمت ۴', type: 'text' },
        { key: 'service_4_desc', label: 'توضیح خدمت ۴', type: 'text' },
      ],
    },
    contact: {
      label: 'تماس',
      fields: [
        { key: 'contact_address', label: 'آدرس', type: 'text' },
        { key: 'contact_phone', label: 'تلفن', type: 'text' },
        { key: 'contact_email', label: 'ایمیل', type: 'text' },
        { key: 'contact_hours', label: 'ساعت کاری', type: 'text' },
      ],
    },
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">تنظیمات سایت</h1>
        <p className="text-sm text-gray-400">محتوای صفحه اصلی را ویرایش کنید</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Object.entries(sections).map(([key, section]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition ${
              tab === key ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="space-y-5">
          {sections[tab].fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>

              {f.type === 'textarea' ? (
                <textarea
                  value={settings[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="input-field"
                  rows={5}
                />
              ) : f.type === 'image' ? (
                <div>
                  {settings[f.key] && (
                    <div className="mb-3">
                      <img
                        src={settings[f.key].startsWith('http') ? settings[f.key] : `${API_BASE}${settings[f.key]}`}
                        alt=""
                        className="w-40 h-32 object-cover rounded-xl border"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="btn-secondary text-sm cursor-pointer">
                      {uploading[f.key] ? 'در حال آپلود...' : 'انتخاب تصویر'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading[f.key]}
                        onChange={(e) => {
                          if (e.target.files[0]) handleUpload(f.key, e.target.files[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {settings[f.key] && (
                      <button
                        onClick={() => handleChange(f.key, '')}
                        className="text-xs text-red-500 hover:underline"
                      >
                        حذف تصویر
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <input
                  value={settings[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="input-field"
                />
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-6">
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </Layout>
  );
}
