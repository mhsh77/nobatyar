import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import API from '../../api/axios';
import { formatPersianDate } from '../../utils/persianDate';
import MedicalRecordForm from '../../components/MedicalRecordForm';

export default function DoctorAppointments() {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [visitModal, setVisitModal] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await API.get(`/appointments/upcoming${params}`);
      setAppointments(res.data.appointments || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/appointments/${id}/status`, { status });
      addToast('وضعیت به‌روزرسانی شد', 'success');
      loadAppointments();
    } catch {
      addToast('خطا', 'error');
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">نوبت‌ها</h1>
        <p className="text-sm text-gray-400">مشاهده و مدیریت نوبت‌ها</p>
      </div>

      <div className="card">
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { key: 'all', label: 'همه' },
            { key: 'pending', label: 'در انتظار' },
            { key: 'confirmed', label: 'تایید شده' },
            { key: 'completed', label: 'انجام شده' },
            { key: 'missed', label: 'عدم حضور' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap ${
                filter === f.key
                  ? 'bg-medical-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : appointments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">نوبتی یافت نشد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">بیمار</th>
                  <th className="table-header">کد ملی</th>
                  <th className="table-header">موبایل</th>
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
                    <td className="table-cell" dir="ltr">{app.patient_national_id}</td>
                    <td className="table-cell" dir="ltr">{app.patient_mobile}</td>
                    <td className="table-cell">{formatPersianDate(app.date)}</td>
                    <td className="table-cell">{app.time}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status === 'pending' ? 'در انتظار' :
                         app.status === 'confirmed' ? 'تایید شده' :
                         app.status === 'completed' ? 'انجام شده' : 'عدم حضور'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {app.status === 'pending' || app.status === 'confirmed' ? (
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => setVisitModal(app)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 whitespace-nowrap">ویزیت</button>
                          <button onClick={() => updateStatus(app.id, 'missed')} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 whitespace-nowrap">عدم حضور</button>
                        </div>
                      ) : app.status === 'completed' || app.status === 'missed' ? (
                        <button onClick={() => setVisitModal(app)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 whitespace-nowrap">پرونده</button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
