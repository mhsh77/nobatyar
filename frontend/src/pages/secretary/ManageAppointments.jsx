import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import API from '../../api/axios';
import { formatPersianDate } from '../../utils/persianDate';
import MedicalRecordForm from '../../components/MedicalRecordForm';

export default function ManageAppointments() {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [visitModal, setVisitModal] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [statusFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await API.get(`/secretary/appointments?${params.toString()}`);
      setAppointments(res.data.appointments || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, data) => {
    try {
      const url = data ? `/secretary/appointments/${id}/${action}` : `/secretary/appointments/${id}/${action}`;
      await API.patch(url, data || {});
      const messages = {
        confirm: 'نوبت تایید شد',
        reject: 'نوبت رد شد',
        arrived: 'حضور بیمار ثبت شد',
        absent: 'غیبت ثبت شد',
      };
      addToast(messages[action] || 'عملیات انجام شد', 'success');
      loadAppointments();
      setRescheduleModal(null);
    } catch (err) {
      addToast(err.response?.data?.error || 'خطا', 'error');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModal) return;
    await handleAction(rescheduleModal.id, 'reschedule', {
      date: rescheduleModal.date,
      time: rescheduleModal.time,
    });
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">مدیریت نوبت‌ها</h1>
        <p className="text-sm text-gray-400">تایید، رد و تغییر نوبت‌ها</p>
      </div>

      <div className="card mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: '', label: 'همه' },
            { key: 'pending', label: 'در انتظار' },
            { key: 'confirmed', label: 'تایید شده' },
            { key: 'rejected', label: 'رد شده' },
            { key: 'completed', label: 'انجام شده' },
            { key: 'missed', label: 'عدم حضور' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-medical-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : appointments.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-gray-400">نوبتی یافت نشد</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="table-header">بیمار</th>
                <th className="table-header">کد ملی</th>
                <th className="table-header">موبایل</th>
                <th className="table-header">بیماری‌ها</th>
                <th className="table-header">تاریخ</th>
                <th className="table-header">ساعت</th>
                <th className="table-header">وضعیت</th>
                <th className="table-header">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((app) => (
                <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="table-cell font-medium">{app.patient_name}</td>
                  <td className="table-cell text-xs" dir="ltr">{app.patient_national_id}</td>
                  <td className="table-cell text-xs" dir="ltr">{app.patient_mobile}</td>
                  <td className="table-cell text-xs max-w-[120px] truncate">{app.patient_diseases || '-'}</td>
                   <td className="table-cell text-xs">{formatPersianDate(app.date)}</td>
                  <td className="table-cell text-xs">{app.time}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      app.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {app.status === 'pending' ? 'در انتظار' :
                       app.status === 'confirmed' ? 'تایید شده' :
                       app.status === 'rejected' ? 'رد شده' :
                       app.status === 'completed' ? 'انجام شده' : 'عدم حضور'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {app.status === 'pending' && (
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => handleAction(app.id, 'confirm')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">تایید</button>
                        <button onClick={() => handleAction(app.id, 'reject')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">رد</button>
                        <button onClick={() => setRescheduleModal(app)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">تغییر</button>
                      </div>
                    )}
                    {app.status === 'confirmed' && (
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => handleAction(app.id, 'arrived')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">حضور</button>
                        <button onClick={() => handleAction(app.id, 'absent')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">غیبت</button>
                        <button onClick={() => setRescheduleModal(app)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">تغییر</button>
                      </div>
                    )}
                    {(app.status === 'rejected') && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                    {(app.status === 'completed' || app.status === 'missed') && (
                      <button onClick={() => setVisitModal(app)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs whitespace-nowrap">پرونده</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-700 mb-4">تغییر زمان نوبت</h3>
            <p className="text-xs text-gray-400 mb-4">
              {rescheduleModal.patient_name} - {formatPersianDate(rescheduleModal.date)} {rescheduleModal.time}
            </p>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">تاریخ جدید</label>
                <input
                  type="date"
                  value={rescheduleModal.date}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, date: e.target.value })}
                  className="input-field"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">ساعت جدید</label>
                <input
                  type="time"
                  value={rescheduleModal.time}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, time: e.target.value })}
                  className="input-field"
                  dir="ltr"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">ذخیره</button>
                <button type="button" onClick={() => setRescheduleModal(null)} className="btn-secondary flex-1">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visitModal && (
        <MedicalRecordForm
          appointment={visitModal}
          onClose={() => setVisitModal(null)}
          onSaved={() => { loadAppointments(); }}
        />
      )}
    </Layout>
  );
}
