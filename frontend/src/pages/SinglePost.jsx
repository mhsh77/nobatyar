import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { formatPersianDate } from '../utils/persianDate';
import API from '../api/axios';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import SEO from '../components/SEO';
import { useToast } from '../components/Toast';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

const COMMENTS_API = `${API_BASE}/api/comments`;

export default function SinglePost() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentForm, setCommentForm] = useState({ name: '', phone: '', content: '' });
  const [otpStep, setOtpStep] = useState('phone');
  const [otpCode, setOtpCode] = useState('');
  const [otpSentCode, setOtpSentCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get(`/posts/${id}`)
      .then((res) => setPost(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${COMMENTS_API}/${id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {}
  };

  const handleSendOtp = async () => {
    if (!commentForm.phone || commentForm.phone.length < 10) {
      addToast('شماره معتبر وارد کنید', 'error'); return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${COMMENTS_API}/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: commentForm.phone }),
      });
      const d = await res.json();
      if (d.success) { setOtpStep('code'); setOtpSentCode(d.code || ''); }
      else addToast(d.error || 'خطا', 'error');
    } catch { addToast('خطا در ارتباط', 'error'); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      addToast('کد تایید را وارد کنید', 'error'); return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${COMMENTS_API}/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: commentForm.phone, code: otpCode }),
      });
      const d = await res.json();
      if (d.success) setOtpStep('verified');
      else addToast(d.error || 'کد نامعتبر', 'error');
    } catch { addToast('خطا در ارتباط', 'error'); }
    finally { setOtpLoading(false); }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentForm.name.trim() || !commentForm.content.trim()) {
      addToast('نام و متن نظر را وارد کنید', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${COMMENTS_API}/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentForm),
      });
      const d = await res.json();
      if (d.success) {
        addToast('نظر شما ثبت شد و پس از تایید نمایش داده می‌شود', 'success');
        setCommentForm({ name: '', phone: '', content: '' });
        setOtpStep('phone');
        setOtpCode('');
      } else {
        addToast(d.error || 'خطا', 'error');
      }
    } catch { addToast('خطا در ارتباط', 'error'); }
    finally { setSubmitting(false); }
  };

  const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none transition-all focus:border-emerald-500 bg-gray-50/50';

  return (
    <>
      <SEO
        title={`${post ? post.title + ' | ' : ''}دکتر حسین مرادی`}
        description={post ? post.content?.slice(0, 150) : 'مقالات پزشکی'}
        url={`https://moradipsy.ir/blog/${id}`}
      />
      <main>
      <Navbar />
      <section className="pt-28 pb-20 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 mb-8 transition">
            <FiArrowLeft size={14} />
            بازگشت به وبلاگ
          </Link>

          {loading ? (
            <p className="text-center text-sm text-white/40 py-16">در حال بارگذاری...</p>
          ) : !post ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center py-16 border border-white/10">
              <p className="text-white/40 text-sm">مطلب یافت نشد</p>
            </div>
          ) : (
            <>
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/10"
            >
              {post.image && (
                <img src={`${API_BASE}${post.image}`} alt="" className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-lg mb-8" />
              )}
              <p className="text-sm text-white/50 mb-3">
                {post.author_name} — {formatPersianDate(post.created_at?.split(' ')[0])}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">{post.title}</h1>
              <div className="text-white/70 leading-relaxed text-sm md:text-base whitespace-pre-line">{post.content}</div>
            </motion.article>

            {/* Comments Section */}
            <div className="mt-10 space-y-6">
              {/* Comments Display */}
              {comments.length > 0 && (
                <div>
                  <h3 className="text-white font-bold text-lg mb-4">نظرات ({comments.length})</h3>
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-emerald-300 text-sm font-medium">{c.name}</span>
                          <span className="text-white/30 text-xs">{c.created_at}</span>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed">{c.content}</p>
                        {c.replies && c.replies.length > 0 && (
                          <div className="mr-6 mt-3 space-y-3 border-r-2 border-emerald-700/30 pr-4">
                            {c.replies.map((r) => (
                              <div key={r.id}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-emerald-400 text-xs font-medium">دکتر حسین مرادی</span>
                                  <span className="text-white/20 text-xs">{r.created_at}</span>
                                </div>
                                <p className="text-white/60 text-sm">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment Form */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-bold text-lg mb-4">ارسال نظر</h3>
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">نام</label>
                    <input value={commentForm.name} onChange={e => setCommentForm(p => ({...p, name: e.target.value}))} className={inp} placeholder="نام شما" />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">شماره تماس</label>
                    {otpStep === 'verified' ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-700/50 rounded-xl text-sm text-green-300">
                        <span>✅</span><span dir="ltr">{commentForm.phone}</span>
                        <button type="button" onClick={() => { setOtpStep('phone'); setOtpCode(''); }} className="mr-auto text-green-400 text-xs">تغییر</button>
                      </div>
                    ) : otpStep === 'code' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60">
                          <span>📱</span><span dir="ltr">{commentForm.phone}</span>
                          <button type="button" onClick={() => setOtpStep('phone')} className="mr-auto text-emerald-400 text-xs">ویرایش</button>
                        </div>
                        {otpSentCode && <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-2 text-center text-xs text-blue-300">کد تایید: <strong dir="ltr">{otpSentCode}</strong></div>}
                        <div className="flex gap-2">
                          <input value={otpCode} onChange={e => setOtpCode(e.target.value)} className="flex-1 px-4 py-3 border-2 border-white/20 rounded-xl text-sm text-center outline-none focus:border-emerald-500 bg-white/5 text-white" placeholder="کد تایید" dir="ltr" maxLength={4} />
                          <button type="button" onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length < 4} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition disabled:opacity-50">{otpLoading ? '...' : 'تایید'}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={commentForm.phone} onChange={e => setCommentForm(p => ({...p, phone: e.target.value}))} className="flex-1 px-4 py-3 border-2 border-white/20 rounded-xl text-sm outline-none focus:border-emerald-500 bg-white/5 text-white" placeholder="0912xxxxxxx" dir="ltr" />
                        <button type="button" onClick={handleSendOtp} disabled={otpLoading || commentForm.phone.length < 10} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap">{otpLoading ? '...' : 'ارسال کد'}</button>
                      </div>
                    )}
                    {otpStep !== 'verified' && <p className="text-amber-300 text-xs mt-2">ابتدا شماره خود را تایید کنید</p>}
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">نظر شما</label>
                    <textarea value={commentForm.content} onChange={e => setCommentForm(p => ({...p, content: e.target.value}))} className={`${inp} min-h-[100px] resize-y`} placeholder="نظر خود را بنویسید..." rows={3} />
                  </div>
                  <button type="submit" disabled={submitting || otpStep !== 'verified'} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                    {submitting ? 'در حال ارسال...' : 'ارسال نظر'}
                  </button>
                </form>
              </div>
            </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
    </>
  );
}
