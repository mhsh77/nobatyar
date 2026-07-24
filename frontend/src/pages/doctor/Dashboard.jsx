import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import { formatPersianDateShort } from '../../utils/persianDate';
import MedicalRecordForm from '../../components/MedicalRecordForm';
import API from '../../api/axios';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export default function DoctorDashboard() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('today');
  const [todayApps, setTodayApps] = useState([]);
  const [nextPatient, setNextPatient] = useState(null);
  const [counts, setCounts] = useState({ total: 0, pending: 0, completed: 0, missed: 0, confirmed: 0 });
  const [totalPending, setTotalPending] = useState(0);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState([]);
  const [allTimes, setAllTimes] = useState([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [visitModal, setVisitModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    if (tab === 'weekly') loadGrid();
  }, [tab, weekOffset]);

  const loadTodayData = async () => {
    try {
      const [todayRes, nextRes, countRes, pendingRes] = await Promise.all([
        API.get('/appointments/today'),
        API.get('/appointments/next'),
        API.get('/appointments/count/today'),
        API.get('/appointments/upcoming?status=pending'),
      ]);
      setTodayApps(todayRes.data.appointments || []);
      setNextPatient(nextRes.data.appointment);
      setCounts(countRes.data);
      setPendingApps(pendingRes.data.appointments || []);
      setTotalPending(pendingRes.data.appointments?.length || 0);
    } catch {} finally {
      setLoading(false);
    }
  };

  const loadGrid = async () => {
    setGridLoading(true);
    try {
      const res = await API.get('/schedule/weekly-grid?offset=' + weekOffset);
      setGrid(res.data.grid || []);
      setAllTimes(res.data.all_times || []);
    } catch {} finally {
      setGridLoading(false);
    }
  };

  const statusLabels = {
    confirmed: 'تایید شده',
    rejected: 'رد شده',
    completed: 'انجام شده',
    missed: 'عدم حضور',
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/appointments/${id}/status`, { status });
      addToast(`وضعیت نوبت به ${statusLabels[status] || status} تغییر یافت`, 'success');
      loadTodayData();
    } catch {
      addToast('خطا در به‌روزرسانی وضعیت', 'error');
    }
  };

  const handleReschedule = async () => {
    if (!newTime) return;
    setRescheduling(true);
    try {
      await API.patch(`/appointments/${rescheduleModal.id}/status`, { status: 'confirmed', time: newTime });
      addToast('نوبت با زمان جدید تایید شد', 'success');
      setRescheduleModal(null);
      setNewTime('');
      loadTodayData();
    } catch {
      addToast('خطا', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">داشبورد پزشک</h1>
        <p className="text-sm text-gray-400">خوش آمدید</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('today')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === 'today' ? 'bg-medical-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          خلاصه امروز
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === 'weekly' ? 'bg-medical-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          جدول هفتگی
        </button>
      </div>

      {tab === 'today' && (
        <>
          {loading ? <Loading /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="card text-center">
                  <p className="text-3xl font-bold text-medical-600">{counts.total}</p>
                  <p className="text-xs text-gray-500 mt-1">مجموع امروز</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-yellow-500">{counts.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">در انتظار امروز</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-orange-500">{totalPending}</p>
                  <p className="text-xs text-gray-500 mt-1">کل در انتظار</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-green-500">{counts.completed}</p>
                  <p className="text-xs text-gray-500 mt-1">انجام شده</p>
                </div>
                <div className="card text-center">
                  <p className="text-3xl font-bold text-red-500">{counts.missed}</p>
                  <p className="text-xs text-gray-500 mt-1">عدم حضور</p>
                </div>
              </div>

              {nextPatient && (
                <div className="card mb-8 border-r-4 border-medical-500">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🩺</span>
                    <h2 className="font-bold text-gray-700">بیمار بعدی</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-400">نام:</span> <span className="font-medium">{nextPatient.patient_name}</span></div>
                    <div><span className="text-gray-400">ساعت:</span> <span className="font-medium">{nextPatient.time}</span></div>
                    <div><span className="text-gray-400">موبایل:</span> <span className="font-medium" dir="ltr">{nextPatient.patient_mobile}</span></div>
                  </div>
                </div>
              )}

              {pendingApps.length > 0 && (
                <div className="card mb-6 border-r-4 border-orange-400">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-700">نوبت‌های در انتظار (همه روزها)</h2>
                    <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{pendingApps.length} نوبت</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="table-header">نام بیمار</th>
                          <th className="table-header">موبایل</th>
                          <th className="table-header">تاریخ</th>
                          <th className="table-header">ساعت</th>
                          <th className="table-header">وضعیت</th>
                          <th className="table-header">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApps.map((app) => (
                          <tr key={app.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="table-cell font-medium">{app.patient_name}</td>
                            <td className="table-cell text-right">{app.patient_mobile}</td>
                            <td className="table-cell">{app.date}</td>
                            <td className="table-cell">{app.time}</td>
                            <td className="table-cell">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">در انتظار</span>
                            </td>
                            <td className="table-cell">
                              <div className="flex gap-1">
                                <button onClick={() => updateStatus(app.id, 'confirmed')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">تایید</button>
                                <button onClick={() => setRescheduleModal(app)} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200">⏱ تغییر</button>
                                <button onClick={() => updateStatus(app.id, 'rejected')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">رد</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-700">نوبت‌های امروز</h2>
                </div>
                {todayApps.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">نوبتی برای امروز وجود ندارد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="table-header">نام بیمار</th>
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
                                app.status === 'missed' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {app.status === 'pending' ? 'در انتظار' :
                                 app.status === 'confirmed' ? 'تایید شده' :
                                 app.status === 'completed' ? 'انجام شده' :
                                 app.status === 'missed' ? 'عدم حضور' : 'رد شده'}
                              </span>
                            </td>
                            <td className="table-cell">
                              {app.status === 'pending' ? (
                                <div className="flex gap-1 flex-wrap">
                                  <button onClick={() => updateStatus(app.id, 'confirmed')} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 whitespace-nowrap">تایید</button>
                                  <button onClick={() => setRescheduleModal(app)} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs hover:bg-amber-200 whitespace-nowrap">⏱ تغییر</button>
                                  <button onClick={() => updateStatus(app.id, 'rejected')} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 whitespace-nowrap">رد</button>
                                </div>
                              ) : app.status === 'confirmed' ? (
                                <div className="flex gap-1 flex-wrap">
                                  <button onClick={() => setRescheduleModal(app)} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs hover:bg-amber-200 whitespace-nowrap">⏱ تغییر زمان</button>
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
            </>
          )}
        </>
      )}

      {tab === 'weekly' && (
        <>
          {gridLoading ? <Loading /> : grid.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-gray-400">برنامه هفتگی ثبت نشده است</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={() => setWeekOffset(weekOffset - 1)} className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">→ هفته قبل</button>
                <span className="text-sm font-bold text-gray-700">هفته {weekOffset === 0 ? 'جاری' : weekOffset < 0 ? `${Math.abs(weekOffset)} قبل` : `${weekOffset} بعد`}</span>
                <button onClick={() => setWeekOffset(weekOffset + 1)} className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">هفته بعد ←</button>
                {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="px-3 py-2 bg-medical-600 text-white rounded-lg text-sm hover:bg-medical-700">امروز</button>}
              </div>
            <div className="card overflow-x-auto">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"></span> وقت خالی</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> رزرو شده</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border inline-block"></span> تعطیل پزشک</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 inline-block"></span> تعطیل رسمی</span>
                </div>
                <button onClick={loadGrid} className="text-xs text-medical-600 hover:underline px-2 py-1">بروزرسانی</button>
              </div>

              <div className="min-w-max" dir="rtl">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-px bg-gray-200">
                  <div className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">ساعت</div>
                  {grid.map((day) => (
                    <div key={day.day_index} className="bg-gray-50 p-2 text-center">
                      <div className="text-xs font-bold text-gray-700">{day.day_name}</div>
                      <div className="text-[10px] text-gray-400">{formatPersianDateShort(day.date)}</div>
                    </div>
                  ))}

                  {allTimes.map((time) => (
                    <React.Fragment key={time}>
                      <div className="bg-white p-2 text-center text-xs text-gray-500 flex items-center justify-center">
                        {time}
                      </div>
                      {grid.map((day) => {
                        const slotsAtTime = day.slots.filter((s) => s.time === time);
                        let bg = 'bg-gray-100';
                        let cellTitle = 'تعطیل پزشک';
                        if (day.is_closed) {
                          bg = 'bg-orange-100';
                          cellTitle = 'تعطیل رسمی';
                        } else if (slotsAtTime.length > 0) {
                          const booked = slotsAtTime.filter((s) => s.status === 'booked');
                          if (booked.length > 0) {
                            bg = 'bg-red-200';
                            cellTitle = booked.map((s) => s.patient_name).join(' | ');
                          } else {
                            bg = 'bg-green-200';
                            cellTitle = 'وقت خالی';
                          }
                        }
                        return (
                          <div
                            key={`${day.day_index}-${time}`}
                            className={`${bg} p-1 text-center text-[10px] relative group cursor-default min-h-[32px]`}
                            title={cellTitle}
                          >
                            {slotsAtTime.filter((s) => s.status === 'booked').map((s, i) => (
                              <div key={i} className="text-[10px] text-gray-800 truncate leading-tight">
                                {s.patient_name}
                              </div>
                            ))}
                            {slotsAtTime.length > 0 && slotsAtTime.every((s) => s.status === 'available') && (
                              <span className="text-green-700 text-[10px]">✓</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {grid.some((d) => d.extra_slots?.length > 0) && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">نوبت‌های خارج از برنامه هفتگی:</p>
                  {grid.filter((d) => d.extra_slots?.length > 0).map((day) => (
                    <div key={day.day_index} className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">{day.day_name}:</span>
                      {day.extra_slots.map((s, i) => (
                        <span key={i} className="mr-2 text-red-600">{s.patient_name} ({s.time})</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
          )}
        </>
      )}
      {visitModal && (
        <MedicalRecordForm
          appointment={visitModal}
          onClose={() => setVisitModal(null)}
          onSaved={loadTodayData}
        />
      )}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setRescheduleModal(null); setNewTime(''); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-1">تغییر زمان نوبت</h3>
            <p className="text-sm text-gray-400 mb-4">بیمار: {rescheduleModal.patient_name} — زمان فعلی: {rescheduleModal.time}</p>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-medical-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={handleReschedule} disabled={rescheduling || !newTime} className="flex-1 py-2.5 bg-medical-600 text-white rounded-lg text-sm font-medium hover:bg-medical-700 transition disabled:opacity-50">{rescheduling ? '...' : 'تایید نوبت با زمان جدید'}</button>
              <button onClick={() => { setRescheduleModal(null); setNewTime(''); }} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
