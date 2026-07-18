import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

export default function Capture() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError('دوربین یافت نشد یا دسترسی ندارید');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      setCaptured(blob);
      stopCamera();
      setStreaming(false);
    }, 'image/jpeg', 0.9);
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const upload = async () => {
    if (!captured || !recordId) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('images', captured, `capture_${Date.now()}.jpg`);
      await API.put(`/medical-records/update/${recordId}`, fd);
      setDone(true);
    } catch {
      setError('خطا در آپلود');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Link to="/medical-records" className="text-white text-sm hover:text-gray-300">بازگشت</Link>
        <span className="text-white text-sm">ثبت تصویر</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {error && (
          <div className="bg-red-500 text-white text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {done ? (
          <div className="text-center text-white">
            <span className="text-6xl block mb-4">✅</span>
            <p className="text-lg mb-4">تصویر با موفقیت آپلود شد</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/medical-records')} className="px-6 py-3 bg-white text-black rounded-lg text-sm">بازگشت</button>
              <button onClick={() => { setDone(false); setCaptured(null); startCamera(); }} className="px-6 py-3 bg-medical-600 text-white rounded-lg text-sm">تصویر بعدی</button>
            </div>
          </div>
        ) : (
          <>
            {captured ? (
              <div className="text-center">
                <img src={URL.createObjectURL(captured)} alt="" className="max-h-[60vh] rounded-lg shadow-lg mb-4" />
                <div className="flex gap-3 justify-center">
                  <button onClick={upload} disabled={uploading} className="px-8 py-3 bg-medical-600 text-white rounded-lg text-sm">
                    {uploading ? 'در حال آپلود...' : 'آپلود'}
                  </button>
                  <button onClick={retake} disabled={uploading} className="px-8 py-3 bg-gray-600 text-white rounded-lg text-sm">تکرار</button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full max-w-md mx-auto">
                <video ref={videoRef} className="w-full rounded-lg shadow-lg bg-gray-900" style={{ minHeight: 300 }} />
                <canvas ref={canvasRef} className="hidden" />
                {streaming && (
                  <button onClick={capture} className="mt-6 w-16 h-16 rounded-full bg-white border-4 border-medical-500 flex items-center justify-center mx-auto hover:bg-gray-100 transition">
                    <span className="w-12 h-12 rounded-full bg-medical-500"></span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
