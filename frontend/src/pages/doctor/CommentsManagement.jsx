import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { Link } from 'react-router-dom';
import { formatPersianDate } from '../../utils/persianDate';
import API from '../../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

const COMMENTS_API = `${API_BASE}/api/comments`;

export default function CommentsManagement() {
  const { addToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    API.get('/posts/admin').then(res => setPosts(res.data.posts || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadComments = async (postId) => {
    setSelectedPost(postId);
    setLoadingComments(true);
    try {
      const res = await fetch(`${COMMENTS_API}/admin/${postId}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {}
    finally { setLoadingComments(false); }
  };

  const handleApprove = async (commentId) => {
    try {
      const res = await fetch(`${COMMENTS_API}/${commentId}/approve`, { method: 'PUT' });
      const d = await res.json();
      if (d.success) {
        addToast('نظر تایید شد', 'success');
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, approved: true } : c));
      }
    } catch { addToast('خطا', 'error'); }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      const res = await fetch(`${COMMENTS_API}/${commentId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        addToast('حذف شد', 'success');
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch { addToast('خطا', 'error'); }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`${COMMENTS_API}/${commentId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      });
      const d = await res.json();
      if (d.success) {
        addToast('پاسخ ثبت شد و پیامک به کاربر ارسال شد', 'success');
        setReplyingTo(null);
        setReplyText('');
        loadComments(selectedPost);
      } else addToast(d.error || 'خطا', 'error');
    } catch { addToast('خطا', 'error'); }
    finally { setSendingReply(false); }
  };

  const pendingCount = comments.filter(c => !c.approved).length;

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-6">مدیریت نظرات</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-700 text-sm">پست‌ها</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {posts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">پستی وجود ندارد</p>
              ) : posts.map(p => (
                <button
                  key={p.id}
                  onClick={() => loadComments(p.id)}
                  className={`w-full text-right px-4 py-3 text-sm transition hover:bg-gray-50 ${selectedPost === p.id ? 'bg-medical-50 border-r-2 border-medical-500' : ''}`}
                >
                  <p className="font-medium text-gray-700 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.author_name} — {formatPersianDate(p.created_at?.split(' ')[0])}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="lg:col-span-2">
            {!selectedPost ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-400 text-sm">یک پست را انتخاب کنید</p>
              </div>
            ) : loadingComments ? (
              <Loading />
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex gap-3">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex-1 text-center">
                    <div className="text-xl font-bold text-medical-600">{comments.length}</div>
                    <div className="text-xs text-gray-500">کل نظرات</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex-1 text-center">
                    <div className="text-xl font-bold text-amber-600">{pendingCount}</div>
                    <div className="text-xs text-gray-500">در انتظار تایید</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex-1 text-center">
                    <div className="text-xl font-bold text-green-600">{comments.length - pendingCount}</div>
                    <div className="text-xs text-gray-500">تایید شده</div>
                  </div>
                </div>

                {/* Comments List */}
                {comments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <p className="text-gray-400 text-sm">نظری وجود ندارد</p>
                  </div>
                ) : comments.map(c => (
                  <div key={c.id}>
                  <div className={`bg-white rounded-xl shadow-sm border p-4 ${!c.approved ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-700 text-sm">{c.name}</span>
                        <span className="text-gray-400 text-xs mr-3" dir="ltr">{c.phone}</span>
                        <span className={`text-xs mr-3 px-2 py-0.5 rounded-full ${c.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {c.approved ? 'تایید شده' : 'در انتظار'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs">{c.created_at}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">{c.content}</p>
                    <div className="flex gap-2">
                      {!c.approved && (
                        <button onClick={() => handleApprove(c.id)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition">✓ تایید</button>
                      )}
                      <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs hover:bg-blue-200 transition">💬 پاسخ</button>
                      <button onClick={() => handleDelete(c.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition">🗑 حذف</button>
                    </div>
                    {replyingTo === c.id && (
                      <div className="mt-3 flex gap-2">
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-medical-500" placeholder="متن پاسخ..." />
                        <button onClick={() => handleReply(c.id)} disabled={sendingReply || !replyText.trim()} className="px-4 py-2 bg-medical-600 text-white rounded-lg text-sm hover:bg-medical-700 transition disabled:opacity-50">{sendingReply ? '...' : 'ارسال'}</button>
                      </div>
                    )}
                  </div>
                  {/* Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="mr-6 space-y-2 mt-2">
                      {c.replies.map(r => (
                        <div key={r.id} className="bg-blue-50/50 rounded-lg border border-blue-100 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-700 text-xs font-medium">دکتر حسین مرادی</span>
                            <span className="text-gray-400 text-xs">{r.created_at}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
