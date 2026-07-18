import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import API from '../../api/axios';
import { formatPersianDate } from '../../utils/persianDate';

export default function SearchPatients() {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await API.get(`/secretary/patients?q=${encodeURIComponent(query)}`);
      setPatients(res.data.patients || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">جستجوی بیماران</h1>
        <p className="text-sm text-gray-400">جستجو بر اساس نام، کد ملی یا شماره موبایل</p>
      </div>

      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field sm:flex-1"
            placeholder="نام، کد ملی یا شماره موبایل را وارد کنید..."
          />
          <button type="submit" className="btn-primary whitespace-nowrap">جستجو</button>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : searched && patients.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-gray-400">بیماری یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => (
            <div key={patient.id} className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="font-bold text-gray-700">{patient.full_name}</h3>
                  <p className="text-xs text-gray-400" dir="ltr">{patient.national_id} | {patient.mobile}</p>
                </div>
              </div>
              {patient.underlying_diseases && (
                <div className="bg-yellow-50 text-yellow-700 text-xs p-2 rounded-lg mb-3">
                  بیماری‌های زمینه‌ای: {patient.underlying_diseases}
                </div>
              )}
              <h4 className="text-sm font-medium text-gray-600 mb-2">نوبت‌های اخیر</h4>
              {patient.appointments.length === 0 ? (
                <p className="text-xs text-gray-400">نوبتی ثبت نشده</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="table-header">تاریخ</th>
                        <th className="table-header">ساعت</th>
                        <th className="table-header">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.appointments.map((app) => (
                        <tr key={app.id} className="border-b last:border-0">
                          <td className="table-cell">{formatPersianDate(app.date)}</td>
                          <td className="table-cell">{app.time}</td>
                          <td className="table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
