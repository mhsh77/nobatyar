import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { formatPersianDate } from '../utils/persianDate';
import API from '../api/axios';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import SEO from '../components/SEO';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

export default function SinglePost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/posts/${id}`)
      .then((res) => setPost(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/10"
            >
              {post.image && (
                <img
                  src={`${API_BASE}${post.image}`}
                  alt=""
                  className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-lg mb-8"
                />
              )}

              <p className="text-sm text-white/50 mb-3">
                {post.author_name} — {formatPersianDate(post.created_at.split(' ')[0])}
              </p>

              <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                {post.title}
              </h1>

              <div className="text-white/70 leading-relaxed text-sm md:text-base whitespace-pre-line">
                {post.content}
              </div>
            </motion.article>
          )}
        </div>
      </section>
      <Footer />
    </main>
    </>
  );
}
