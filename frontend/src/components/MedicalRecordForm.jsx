import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

export default function MedicalRecordForm({ appointment, onClose, onSaved }) {
  const [form, setForm] = useState({
    patient_id: appointment?.patient_id || '',
    appointment_id: appointment?.id || '',
    visit_date: appointment?.date || new Date().toISOString().split('T')[0],
    chief_complaint: '',
    history: '',
    diagnosis: '',
    treatment_plan: '',
    medications: '',
    insurance_company: '',
    insurance_type: '',
    notes: '',
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (appointment?.id && appointment?.patient_id) {
      loadExistingRecord();
    }
  }, [appointment?.id, appointment?.patient_id]);

  const loadExistingRecord = async () => {
    if (!appointment?.patient_id) return;
    try {
      const res = await API.get(`/medical-records/${appointment.patient_id}`);
      const records = res.data.records || [];
      const match = records.find((r) => r.appointment_id === appointment.id);
      if (match) {
        setRecordId(match.id);
        setForm({
          patient_id: match.patient_id,
          appointment_id: match.appointment_id,
          visit_date: match.visit_date,
          chief_complaint: match.chief_complaint,
          history: match.history,
          diagnosis: match.diagnosis,
          treatment_plan: match.treatment_plan,
          medications: match.medications,
          insurance_company: match.insurance_company,
          insurance_type: match.insurance_type,
          notes: match.notes,
        });
        setExistingImages(match.images || []);
      }
    } catch {}
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFiles = (e) => {
    setImages([...images, ...Array.from(e.target.files)]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (filename) => {
    if (!recordId) return;
    try {
      await API.delete(`/medical-records/delete-image/${recordId}`, {
        data: { filename },
      });
      setExistingImages(existingImages.filter((f) => f !== filename));
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Sending form:', form);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((img) => fd.append('images', img));

      const url = recordId
        ? `/medical-records/update/${recordId}`
        : '/medical-records';

      await API({
        method: recordId ? 'PUT' : 'POST',
        url,
        data: fd,
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ذخیره');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-700">
            {recordId ? 'ویرایش پرونده پزشکی' : 'ویزیت بیمار'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">تاریخ ویزیت</label>
              <input type="date" name="visit_date" value={form.visit_date} onChange={handleChange} className="input-field" dir="ltr" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">بیمه</label>
              <input name="insurance_company" value={form.insurance_company} onChange={handleChange} className="input-field" placeholder="نام شرکت بیمه" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">نوع بیمه</label>
              <input name="insurance_type" value={form.insurance_type} onChange={handleChange} className="input-field" placeholder="مثلاً: پایه، تکمیلی" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">نام بیمار</label>
              <input value={appointment?.patient_name || ''} className="input-field bg-gray-50" disabled />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">شکایت اصلی</label>
            <textarea name="chief_complaint" value={form.chief_complaint} onChange={handleChange} className="input-field" rows={2} placeholder="شکایت اصلی بیمار" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">شرح حال</label>
            <textarea name="history" value={form.history} onChange={handleChange} className="input-field" rows={3} placeholder="شرح حال بیماری" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">تشخیص</label>
            <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} className="input-field" rows={3} placeholder="تشخیص پزشک" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">برنامه درمانی</label>
            <textarea name="treatment_plan" value={form.treatment_plan} onChange={handleChange} className="input-field" rows={2} placeholder="برنامه درمانی پیشنهادی" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">داروهای تجویزی</label>
            <textarea name="medications" value={form.medications} onChange={handleChange} className="input-field" rows={2} placeholder="داروهای تجویز شده" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">یادداشت‌ها</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} className="input-field" rows={2} placeholder="یادداشت‌های اضافی" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">تصاویر و مدارک</label>
            {recordId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                <p className="text-xs text-gray-500 mb-2">اسکن کنید و عکس بگیرید</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + '/capture/' + recordId)}`}
                  alt="QR Code"
                  className="mx-auto rounded-lg"
                />
                <p className="text-[10px] text-gray-400 mt-2 dir-ltr" dir="ltr">
                  {window.location.origin}/capture/{recordId}
                </p>
              </div>
            )}
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={`${API_BASE}/api/uploads/${img}`} alt=""
                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                      onClick={() => setPreviewImage(`${API_BASE}/api/uploads/${img}`)} />
                    <button type="button" onClick={() => removeExistingImage(img)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs opacity-0 group-hover:opacity-100">&times;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="btn-secondary text-sm cursor-pointer">
                انتخاب تصویر
                <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
              </label>
              {images.length > 0 && (
                <span className="text-xs text-gray-400">{images.length} فایل انتخاب شد</span>
              )}
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(img)} alt=""
                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                      onClick={() => setPreviewImage(URL.createObjectURL(img))} />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'در حال ذخیره...' : recordId ? 'به‌روزرسانی پرونده' : 'ذخیره پرونده پزشکی'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">انصراف</button>
          </div>
        </form>
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setPreviewImage(null)}
            className="absolute top-4 left-4 text-white text-3xl hover:text-gray-300">&times;</button>
        </div>
      )}
    </div>
  );
}
