import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { useToast } from '../components/Toast';
import { formatPersianDate } from '../utils/persianDate';
import API from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.viracoai.net:5000';

export default function Posts() {
  const { addToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', published: true });
  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    try {
      const res = await API.get('/posts/admin');
      setPosts(res.data.posts || []);
    } catch {} finally { setLoading(false); }
  };

  const openNew = () => { setEditing(null); setForm({ title: '', content: '', published: true }); setImage(null); setExistingImage(null); setShowForm(true); };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ title: p.title, content: p.content, published: p.published });
    setImage(null);
    setExistingImage(p.image || null);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      addToast('عنوان و متن الزامی است', 'error'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('published', form.published);
      if (image) fd.append('image', image);

      const url = editing ? `/posts/${editing}` : '/posts';
      const method = editing ? 'PUT' : 'POST';
      await API({ method, url, data: fd });
      addToast(editing ? 'پست به‌روزرسانی شد' : 'پست ایجاد شد', 'success');
      setShowForm(false);
      loadPosts();
    } catch { addToast('خطا', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('پست حذف شود؟')) return;
    try {
      await API.delete(`/posts/${id}`);
      addToast('پست حذف شد', 'success');
      loadPosts();
    } catch { addToast('خطا', 'error'); }
  };

  const togglePublish = async (p) => {
    try {
      await API.put(`/posts/${p.id}`, { title: p.title, content: p.content, published: !p.published });
      loadPosts();
    } catch {}
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">پست‌ها</h1>
          <p className="text-sm text-gray-400">مدیریت مطالب سایت</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">پست جدید</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-700">{editing ? 'ویرایش پست' : 'پست جدید'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">عنوان</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">متن پست</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field" rows={12} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">تصویر</label>
                {(existingImage || image) && (
                  <div className="mb-3">
                    <img
                      src={image ? URL.createObjectURL(image) : `${API_BASE}${existingImage}`}
                      alt=""
                      className="w-40 h-28 object-cover rounded-xl border"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="btn-secondary text-sm cursor-pointer">
                    {image ? 'تغییر تصویر' : 'انتخاب تصویر'}
                    <input type="file" accept="image/*" onChange={(e) => { setImage(e.target.files[0]); setExistingImage(null); }} className="hidden" />
                  </label>
                  {(existingImage || image) && (
                    <button type="button" onClick={() => { setImage(null); setExistingImage(null); }} className="text-xs text-red-500 hover:underline">
                      حذف تصویر
                    </button>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                منتشر شده
              </label>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'در حال ذخیره...' : editing ? 'به‌روزرسانی' : 'ایجاد پست'}
              </button>
            </form>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">هیچ پستی وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="card flex gap-4">
              {p.image && (
                <img src={`${API_BASE}${p.image}`} alt="" className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800 truncate">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.published ? 'منتشر شده' : 'پیش‌نویس'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {p.author_name} — {formatPersianDate(p.created_at.split(' ')[0])}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2">{p.content}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(p)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">ویرایش</button>
                  <button onClick={() => togglePublish(p)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
                    {p.published ? 'عدم انتشار' : 'انتشار'}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200">حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
