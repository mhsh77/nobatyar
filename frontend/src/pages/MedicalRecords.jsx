import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import MedicalRecordForm from '../components/MedicalRecordForm';
import { formatPersianDate } from '../utils/persianDate';
import API from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'https://api.moradipsy.ir';

export default function MedicalRecords() {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [expandedPatient, setExpandedPatient] = useState(null);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const res = await API.get('/medical-records/recent');
      setRecentRecords(res.data.records || []);
    } catch {} finally {
      setRecentLoading(false);
    }
  };

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

  const viewRecord = (record) => {
    setSelectedRecord({
      id: record.appointment_id,
      patient_id: record.patient_id,
      patient_name: record.patient_name,
      date: record.visit_date,
    });
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">پرونده‌های پزشکی</h1>
          <p className="text-sm text-gray-400">مشاهده و ویرایش پرونده بیماران</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-sm text-medical-600 hover:underline"
        >
          {showSearch ? 'بستن جستجو' : 'جستجوی بیمار'}
        </button>
      </div>

      {showSearch && (
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

          {loading ? (
            <Loading />
          ) : searched && patients.length === 0 ? (
            <div className="card text-center py-4 mt-4">
              <p className="text-sm text-gray-400">بیماری یافت نشد</p>
            </div>
          ) : searched ? (
            <div className="space-y-3 mt-4">
              {patients.map((patient) => {
                const hasRecords = patient.appointments?.some((a) => a.status === 'completed' || a.status === 'missed');
                return (
                  <div key={patient.id} className="border rounded-lg p-3 cursor-pointer" onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <div>
                          <p className="font-medium text-sm">{patient.full_name}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{patient.national_id} | {patient.mobile}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{hasRecords ? '📋 دارای پرونده' : 'بدون پرونده'}</span>
                    </div>
                    {expandedPatient === patient.id && (
                      <div className="mt-3 border-t pt-3 space-y-2">
                        {patient.appointments.filter((a) => a.status === 'completed' || a.status === 'missed').length === 0 ? (
                          <p className="text-xs text-gray-400">پرونده‌ای یافت نشد</p>
                        ) : (
                          patient.appointments.filter((a) => a.status === 'completed' || a.status === 'missed').map((app) => (
                            <div key={app.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                              <span className="text-xs">{formatPersianDate(app.date)} - {app.time}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRecord({ ...app, patient_id: patient.id, patient_name: patient.full_name }); }}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                              >
                                پرونده
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">آخرین پرونده‌های پزشکی</h2>
          <button onClick={loadRecent} className="text-xs text-medical-600 hover:underline">بروزرسانی</button>
        </div>

        {recentLoading ? (
          <Loading />
        ) : recentRecords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">هیچ پرونده پزشکی ثبت نشده است</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">بیمار</th>
                  <th className="table-header">تشخیص</th>
                  <th className="table-header">پزشک</th>
                  <th className="table-header">تاریخ</th>
                  <th className="table-header">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="table-cell font-medium">{r.patient_name}</td>
                    <td className="table-cell text-xs text-gray-500">{r.diagnosis || '-'}</td>
                    <td className="table-cell text-xs text-gray-500">{r.doctor_name}</td>
                    <td className="table-cell text-xs">{formatPersianDate(r.visit_date)}</td>
                    <td className="table-cell">
                      <button onClick={() => viewRecord(r)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">مشاهده</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <MedicalRecordForm
          appointment={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSaved={() => { setSelectedRecord(null); loadRecent(); }}
        />
      )}
    </Layout>
  );
}
