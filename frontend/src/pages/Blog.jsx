import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { formatPersianDate } from '../utils/persianDate';
import API from '../api/axios';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import SEO from '../components/SEO';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.viracoai.net:5000';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/posts')
      .then((res) => setPosts(res.data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEO title="وبلاگ | دکتر حسین مرادی" description="مقالات و مطالب آموزشی روانشناسی" url="https://moradipsy.ir/blog" />
      <main>
      <Navbar />
      <section className="pt-28 pb-20 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 min-h-screen">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">وبلاگ</h1>
              <p className="text-white/60 mt-1">مطالب آموزشی و اطلاع‌رسانی</p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-sm text-white/40 py-16">در حال بارگذاری...</p>
          ) : posts.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center py-16 border border-white/10">
              <p className="text-white/40 text-sm">هنوز مطلبی منتشر نشده است</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p, i) => (
                <Link key={p.id} to={`/blog/${p.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
                  >
                    {p.image && (
                      <img src={`${API_BASE}${p.image}`} alt="" className="w-full h-48 object-cover" />
                    )}
                    <div className="p-5">
                      <p className="text-xs text-white/40 mb-2">
                        {p.author_name} — {formatPersianDate(p.created_at.split(' ')[0])}
                      </p>
                      <h3 className="font-bold text-white mb-2">{p.title}</h3>
                      <p className="text-sm text-white/60 leading-relaxed">{p.content}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
    </>
  );
}
