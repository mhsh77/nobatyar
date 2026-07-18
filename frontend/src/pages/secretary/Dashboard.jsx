import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import API from '../../api/axios';

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const [todayApps, setTodayApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await API.get('/secretary/appointments?date=today');
      const apps = res.data.appointments || [];
      setTodayApps(apps);
      setStats({
        total: apps.length,
        pending: apps.filter((a) => a.status === 'pending').length,
        confirmed: apps.filter((a) => a.status === 'confirmed').length,
      });
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await API.patch(`/secretary/appointments/${id}/${action}`);
      loadData();
    } catch {}
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">داشبورد منشی</h1>
        <p className="text-sm text-gray-400">مدیریت نوبت‌های امروز</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-medical-600">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">مجموع امروز</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">در انتظار تایید</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-500">{stats.confirmed}</p>
          <p className="text-xs text-gray-500 mt-1">تایید شده</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => navigate('/secretary/appointments')}
          className="btn-primary text-sm"
        >
          مدیریت نوبت‌ها
        </button>
        <button
          onClick={() => navigate('/secretary/search')}
          className="btn-secondary text-sm"
        >
          جستجوی بیماران
        </button>
      </div>

      <div className="card">
        <h2 className="font-bold text-gray-700 mb-4">نوبت‌های امروز</h2>
        {todayApps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">نوبتی برای امروز وجود ندارد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">بیمار</th>
                  <th className="table-header">ساعت</th>
                  <th className="table-header">وضعیت</th>
                  <th className="table-header">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {todayApps.map((app) => (
                  <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="table-cell font-medium">{app.patient_name}</td>
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
                      <div className="flex gap-1">
                        {app.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction(app.id, 'confirm')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">تایید</button>
                            <button onClick={() => handleAction(app.id, 'reject')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">رد</button>
                          </>
                        )}
                        {app.status === 'confirmed' && (
                          <button onClick={() => handleAction(app.id, 'arrived')} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">حضور</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
