import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { formatPersianDate } from '../../utils/persianDate';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

const API_URL = `${API_BASE}/api/feedback`;

export default function SurveyManagement() {
  const { addToast } = useToast();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async (p = 1, q = '') => {
    setLoading(true);
    try {
      let url = `${API_URL}/list?page=${p}&per_page=50`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const d = await res.json();
      setResponses(d.responses || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('حذف شود؟')) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) { addToast('حذف شد', 'success'); load(page, search); }
      else addToast(d.error || 'خطا', 'error');
    } catch { addToast('خطا', 'error'); }
    finally { setDeleting(null); }
  };

  const getStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-6">💬 نظرات بیماران</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="text-2xl font-bold text-medical-600 mb-1">{total}</div>
          <div className="text-xs text-gray-500">کل نظرات ثبت شده</div>
        </div>
        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1, search)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-medical-500 bg-white" placeholder="جستجو..." />
          <button onClick={() => load(1, search)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">🔍</button>
        </div>
        {loading ? <Loading /> : responses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 text-sm">نظری ثبت نشده</div>
        ) : (
          <div className="space-y-4">
            {responses.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700">{r.name}</span>
                    <span className="text-gray-400 text-xs" dir="ltr">{r.phone}</span>
                    <span className="text-amber-400 text-sm">{getStars(r.rating)}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{r.created_at}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{r.content}</p>
                <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition">{deleting === r.id ? '⏳' : '🗑 حذف'}</button>
              </div>
            ))}
            {pages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button disabled={page <= 1} onClick={() => load(page - 1, search)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">قبلی</button>
                <span className="px-3 py-1.5 text-sm text-gray-500">{page} از {pages}</span>
                <button disabled={page >= pages} onClick={() => load(page + 1, search)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">بعدی</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
