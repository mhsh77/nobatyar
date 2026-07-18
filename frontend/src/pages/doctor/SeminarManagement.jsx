import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import API from '../../api/axios';
import JalaliDatePicker from '../../components/JalaliDatePicker';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : '';
const SEMINAR_API = `${API_BASE}/seminar`;

export default function SeminarManagement() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [settings, setSettings] = useState({
    seminar_enabled: false, seminar_title: 'سمینار تخصصی روانشناسی',
    seminar_date: '', seminar_time: '', seminar_location: '', seminar_description: '',
  });

  const [registrations, setRegistrations] = useState([]);
  const [totalRegs, setTotalRegs] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [regsPage, setRegsPage] = useState(1);
  const [regsPages, setRegsPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await API.get('/settings');
      const s = res.data.settings || {};
      setSettings({
        seminar_enabled: s.seminar_enabled === 'true' || s.seminar_enabled === true,
        seminar_title: s.seminar_title || 'سمینار تخصصی روانشناسی',
        seminar_date: s.seminar_date || '', seminar_time: s.seminar_time || '',
        seminar_location: s.seminar_location || '', seminar_description: s.seminar_description || '',
      });
    } catch {}
  }, []);

  const loadRegs = useCallback(async (page = 1, search = '') => {
    try {
      let url = `${SEMINAR_API}/api/registrations?page=${page}&per_page=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url); const d = await res.json();
      setRegistrations(d.registrations || []); setTotalRegs(d.total || 0);
      setRegsPage(d.page || 1); setRegsPages(d.pages || 1);
      const all = await fetch(`${SEMINAR_API}/api/registrations?per_page=10000`); const ad = await all.json();
      setStudentCount((ad.registrations || []).filter(r => r.is_student).length);
    } catch {}
  }, []);

  useEffect(() => { Promise.all([loadSettings(), loadRegs()]).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/settings', {
        seminar_enabled: settings.seminar_enabled ? 'true' : 'false',
        seminar_title: settings.seminar_title, seminar_date: settings.seminar_date,
        seminar_time: settings.seminar_time, seminar_location: settings.seminar_location,
        seminar_description: settings.seminar_description,
      });
      addToast('تنظیمات ذخیره شد', 'success');
    } catch { addToast('خطا در ذخیره', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    const nv = !settings.seminar_enabled;
    setSettings(p => ({ ...p, seminar_enabled: nv }));
    try {
      await API.put('/settings', { seminar_enabled: nv ? 'true' : 'false' });
      addToast(nv ? 'سمینار فعال شد' : 'سمینار غیرفعال شد', 'success');
    } catch { setSettings(p => ({ ...p, seminar_enabled: !nv })); addToast('خطا', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این ثبت‌نام اطمینان دارید؟')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${SEMINAR_API}/api/register/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) { addToast('حذف شد', 'success'); loadRegs(regsPage, searchQuery); }
      else addToast(d.error || 'خطا', 'error');
    } catch { addToast('خطا در حذف', 'error'); }
    finally { setDeletingId(null); }
  };

  const ic = 'w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none transition-all focus:border-medical-500 bg-gray-50';

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">مدیریت سمینار</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">وضعیت: <span className={`font-medium ${settings.seminar_enabled ? 'text-green-600' : 'text-red-500'}`}>{settings.seminar_enabled ? 'فعال' : 'غیرفعال'}</span></span>
            <button onClick={handleToggle} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${settings.seminar_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-all ${settings.seminar_enabled ? 'ml-auto' : 'mr-auto'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('settings')} className={`px-5 py-2 text-sm rounded-lg transition ${tab === 'settings' ? 'bg-white text-medical-700 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚙️ تنظیمات سمینار</button>
          <button onClick={() => setTab('registrations')} className={`px-5 py-2 text-sm rounded-lg transition ${tab === 'registrations' ? 'bg-white text-medical-700 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📋 شرکت‌کنندگان ({totalRegs})</button>
        </div>

        {tab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className="block text-gray-700 text-sm font-medium mb-1.5">عنوان سمینار</label><input value={settings.seminar_title} onChange={e => setSettings(p => ({ ...p, seminar_title: e.target.value }))} className={ic} /></div>
              <JalaliDatePicker label="تاریخ برگزاری" value={settings.seminar_date} onChange={d => setSettings(p => ({ ...p, seminar_date: d }))} />
              <div><label className="block text-gray-700 text-sm font-medium mb-1.5">ساعت برگزاری</label><input type="time" value={settings.seminar_time} onChange={e => setSettings(p => ({ ...p, seminar_time: e.target.value }))} className={ic} /></div>
              <div className="md:col-span-2"><label className="block text-gray-700 text-sm font-medium mb-1.5">مکان برگزاری</label><input value={settings.seminar_location} onChange={e => setSettings(p => ({ ...p, seminar_location: e.target.value }))} className={ic} placeholder="آدرس محل برگزاری" /></div>
              <div className="md:col-span-2"><label className="block text-gray-700 text-sm font-medium mb-1.5">توضیحات</label><textarea value={settings.seminar_description} onChange={e => setSettings(p => ({ ...p, seminar_description: e.target.value }))} className={`${ic} min-h-[100px] resize-y`} rows={4} /></div>
            </div>
            <div className="mt-6 flex justify-end"><button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-medical-600 text-white rounded-lg text-sm font-medium hover:bg-medical-700 transition disabled:opacity-50">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button></div>
          </div>
        )}

        {tab === 'registrations' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-bold text-medical-600">{totalRegs}</div><div className="text-xs text-gray-500 mt-1">کل ثبت‌نام‌ها</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-bold text-blue-600">{studentCount}</div><div className="text-xs text-gray-500 mt-1">دانشجویان</div></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-bold text-gray-600">{totalRegs - studentCount}</div><div className="text-xs text-gray-500 mt-1">سایر</div></div>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex gap-2">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadRegs(1, searchQuery)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-medical-500 bg-white" placeholder="جستجو..." />
                <button onClick={() => loadRegs(1, searchQuery)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">🔍</button>
              </div>
              <button onClick={() => {
                const rows = [['ردیف', 'نام', 'نام خانوادگی', 'شماره تماس', 'نوع', 'رشته', 'ترم', 'تاریخ ثبت'],
                  ...registrations.map((r, i) => [(regsPage - 1) * 50 + i + 1, r.first_name, r.last_name, r.phone, r.is_student ? 'دانشجو' : 'عمومی', r.field_of_study || '', r.semester || '', r.created_at || ''])];
                const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                const b = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `seminar_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
              }} className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition">📥 CSV</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">#</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">نام</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">نام خانوادگی</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">شماره تماس</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">نوع</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">رشته</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">ترم</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">تاریخ ثبت</th>
                    <th className="text-center px-2 py-3 text-gray-500 font-medium w-16">حذف</th>
                  </tr></thead>
                  <tbody>
                    {registrations.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-gray-400">هیچ ثبت‌نامی یافت نشد</td></tr>
                    ) : registrations.map((r, i) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400">{(regsPage - 1) * 50 + i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{r.first_name}</td>
                        <td className="px-4 py-3 text-gray-600">{r.last_name}</td>
                        <td className="px-4 py-3 text-gray-600" dir="ltr">{r.phone}</td>
                        <td className="px-4 py-3"><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${r.is_student ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{r.is_student ? 'دانشجو' : 'عمومی'}</span></td>
                        <td className="px-4 py-3 text-gray-600">{r.field_of_study || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.semester || '-'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.created_at || '-'}</td>
                        <td className="px-2 py-3 text-center">
                          <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="text-red-400 hover:text-red-600 transition disabled:opacity-30 text-lg" title="حذف">{deletingId === r.id ? '⏳' : '🗑️'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {regsPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-100">
                  <button disabled={regsPage <= 1} onClick={() => loadRegs(regsPage - 1, searchQuery)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">قبلی</button>
                  {Array.from({ length: Math.min(regsPages, 5) }, (_, i) => {
                    const s = Math.max(1, Math.min(regsPage - 2, regsPages - 4)); const p = s + i;
                    if (p > regsPages) return null;
                    return <button key={p} onClick={() => loadRegs(p, searchQuery)} className={`px-3 py-1.5 text-sm rounded-lg ${p === regsPage ? 'bg-medical-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>{p}</button>;
                  })}
                  <button disabled={regsPage >= regsPages} onClick={() => loadRegs(regsPage + 1, searchQuery)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">بعدی</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
