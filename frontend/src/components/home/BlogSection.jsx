import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { formatPersianDate } from '../../utils/persianDate';
import API from '../../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.viracoai.net:5000';

export default function BlogSection() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    API.get('/posts')
      .then((res) => setPosts((res.data.posts || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-emerald-600 text-xs font-bold tracking-widest uppercase mb-3">وبلاگ</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">آخرین مطالب</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((p, i) => (
            <Link key={p.id} to={`/blog/${p.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                {p.image && (
                  <img src={`${API_BASE}${p.image}`} alt="" className="w-full h-44 object-cover" />
                )}
                <div className="p-5">
                  <p className="text-xs text-slate-400 mb-2">
                    {p.author_name} — {formatPersianDate(p.created_at.split(' ')[0])}
                  </p>
                  <h3 className="font-bold text-slate-800 mb-2 text-sm leading-relaxed">{p.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{p.content}</p>
                  <span className="text-emerald-600 text-xs font-medium mt-2 inline-flex items-center gap-1 hover:text-emerald-700 transition">ادامه مطلب ←</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition"
          >
            مشاهده همه مطالب
            <FiArrowLeft size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
