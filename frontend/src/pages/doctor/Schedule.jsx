import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Loading from '../../components/Loading';
import { useToast } from '../../components/Toast';
import API from '../../api/axios';
import { formatPersianDate } from '../../utils/persianDate';

const WEEKDAYS = [
  { value: 0, label: 'شنبه' },
  { value: 1, label: 'یکشنبه' },
  { value: 2, label: 'دوشنبه' },
  { value: 3, label: 'سه‌شنبه' },
  { value: 4, label: 'چهارشنبه' },
  { value: 5, label: 'پنجشنبه' },
  { value: 6, label: 'جمعه' },
];

export default function DoctorSchedule() {
  const { addToast } = useToast();
  const [schedule, setSchedule] = useState([]);
  const [closedDays, setClosedDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSchedule, setNewSchedule] = useState({
    weekday: 0,
    start_time: '09:00',
    end_time: '17:00',
    visit_duration: 20,
  });
  const [newClosedDay, setNewClosedDay] = useState({ date: '', reason: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedRes, closedRes] = await Promise.all([
        API.get('/schedule'),
        API.get('/closed-days'),
      ]);
      setSchedule(schedRes.data.schedule || []);
      setClosedDays(closedRes.data.closed_days || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    try {
      await API.post('/schedule', newSchedule);
      addToast('برنامه اضافه شد', 'success');
      setNewSchedule({ ...newSchedule, weekday: 0, start_time: '09:00', end_time: '17:00' });
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || 'خطا', 'error');
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await API.delete(`/schedule/${id}`);
      addToast('برنامه حذف شد', 'success');
      loadData();
    } catch {
      addToast('خطا', 'error');
    }
  };

  const addClosedDay = async (e) => {
    e.preventDefault();
    if (!newClosedDay.date) return;
    try {
      await API.post('/closed-days', newClosedDay);
      addToast('روز تعطیل اضافه شد', 'success');
      setNewClosedDay({ date: '', reason: '' });
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || 'خطا', 'error');
    }
  };

  const removeClosedDay = async (id) => {
    try {
      await API.delete(`/closed-days/${id}`);
      addToast('روز تعطیل حذف شد', 'success');
      loadData();
    } catch {
      addToast('خطا', 'error');
    }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">برنامه هفتگی</h1>
        <p className="text-sm text-gray-400">مدیریت ساعات کاری و روزهای تعطیل</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">افزودن برنامه کاری</h2>
          <form onSubmit={addSchedule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">روز هفته</label>
              <select
                value={newSchedule.weekday}
                onChange={(e) => setNewSchedule({ ...newSchedule, weekday: +e.target.value })}
                className="select-field"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ساعت شروع</label>
                <input
                  type="time"
                  value={newSchedule.start_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                  className="input-field"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ساعت پایان</label>
                <input
                  type="time"
                  value={newSchedule.end_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                  className="input-field"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">مدت زمان ویزیت (دقیقه)</label>
              <input
                type="number"
                value={newSchedule.visit_duration}
                onChange={(e) => setNewSchedule({ ...newSchedule, visit_duration: +e.target.value })}
                className="input-field"
                min={5}
                step={5}
              />
            </div>
            <button type="submit" className="btn-primary w-full">افزودن</button>
          </form>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">برنامه‌های جاری</h2>
          {schedule.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">برنامه‌ای ثبت نشده</p>
          ) : (
            <div className="space-y-2">
              {schedule.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{s.weekday_name}</p>
                    <p className="text-xs text-gray-400">{s.start_time} - {s.end_time} ({s.visit_duration} دقیقه)</p>
                  </div>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="font-bold text-gray-700 mb-4">روزهای تعطیل</h2>

        <form onSubmit={addClosedDay} className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="date"
            value={newClosedDay.date}
            onChange={(e) => setNewClosedDay({ ...newClosedDay, date: e.target.value })}
            className="input-field sm:flex-1"
            dir="ltr"
          />
          <input
            value={newClosedDay.reason}
            onChange={(e) => setNewClosedDay({ ...newClosedDay, reason: e.target.value })}
            className="input-field sm:flex-1"
            placeholder="دلیل تعطیلی (اختیاری)"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">افزودن</button>
        </form>

        {closedDays.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">روز تعطیلی ثبت نشده</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">تاریخ</th>
                  <th className="table-header">دلیل</th>
                  <th className="table-header">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {closedDays.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="table-cell">{formatPersianDate(d.date)}</td>
                    <td className="table-cell text-gray-400">{d.reason || 'بدون توضیح'}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => removeClosedDay(d.id)}
                        className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs"
                      >
                        حذف
                      </button>
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
