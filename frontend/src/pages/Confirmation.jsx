import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';
import { formatPersianDate, formatPersianDateShort } from '../utils/persianDate';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export default function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id, mobile } = location.state || {};

  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [daysLoading, setDaysLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    if (!user_id) { navigate('/book'); return; }
    fetchDays();
  }, [user_id, navigate]);

  const fetchDays = async () => {
    setDaysLoading(true);
    try {
      const res = await API.get('/appointments/days');
      setDays(res.data.days || []);
    } catch {} finally {
      setDaysLoading(false);
    }
  };

  const handleDaySelect = (day) => {
    if (day.status !== 'available') return;
    setSelectedDate(day.date);
    setSelectedDayData(day);
    setSelectedPeriod('');
    setError('');
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedPeriod) {
      setError('تاریخ و بازه زمانی را انتخاب کنید');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/appointments/book', {
        patient_id: user_id,
        date: selectedDate,
        period: selectedPeriod,
      });
      setAppointment(res.data.appointment);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ثبت نوبت');
    } finally {
      setLoading(false);
    }
  };

  if (appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="card w-full max-w-md text-center">
            <span className="text-5xl block mb-2">✅</span>
            <h2 className="text-xl font-bold text-medical-700 mb-2">نوبت با موفقیت ثبت شد</h2>
            <div className="bg-medical-50 rounded-lg p-4 text-right space-y-2 mt-4">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">شماره نوبت</span>
                <span className="font-medium">{appointment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">تاریخ</span>
                <span className="font-medium">{formatPersianDate(appointment.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">ساعت</span>
                <span className="font-medium">{appointment.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">وضعیت</span>
                <span className="font-medium text-yellow-600">در انتظار تایید</span>
              </div>
            </div>
            <Link to="/" className="btn-primary inline-block mt-6">
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col">
      <header className="p-4 lg:p-6">
        <Link to="/verify" className="text-medical-600 hover:text-medical-700 flex items-center gap-2">
          <span>←</span>
          <span>مرحله قبل</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 lg:py-10">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-6">
            <span className="text-4xl">📅</span>
            <h2 className="text-xl font-bold text-gray-800 mt-2">انتخاب تاریخ نوبت</h2>
            <p className="text-sm text-gray-400 mt-1">روز مورد نظر خود را انتخاب کنید</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>
          )}

          {daysLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">در حال بارگذاری...</div>
          ) : days.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">هیچ روزی در ۱۴ روز آینده وجود ندارد</div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x snap-mandatory"
                   style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}>
                {days.map((day) => {
                  const isAvailable = day.status === 'available';
                  const isSelected = selectedDate === day.date;
                  return (
                    <button
                      key={day.date}
                      onClick={() => handleDaySelect(day)}
                      disabled={!isAvailable}
                      className={`snap-start flex-shrink-0 w-32 lg:w-36 p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                        isSelected
                          ? 'border-medical-500 bg-medical-50 shadow-md shadow-medical-100'
                          : isAvailable
                          ? 'border-gray-200 bg-white hover:border-medical-300 hover:shadow-sm cursor-pointer'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">{day.weekday_name}</p>
                      <p className="text-sm font-bold text-gray-800">{formatPersianDateShort(day.date)}</p>

                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {day.status === 'no_schedule' && (
                          <span className="text-xs text-red-500">تعطیل پزشک</span>
                        )}
                        {day.status === 'closed' && (
                          <span className="text-xs text-orange-500">تعطیل</span>
                        )}
                        {day.status === 'full' && (
                          <span className="text-xs text-red-500">ظرفیت کامل</span>
                        )}
                        {day.status === 'available' && (
                          <span className="text-xs text-medical-600 font-medium">
                            {day.total_available < 10 ? `${day.total_available} نوبت باقی مانده` : 'نوبت موجود'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDayData && (
                <div className="card mt-6 max-w-sm mx-auto w-full">
                  <h3 className="text-sm font-bold text-gray-700 text-center mb-4">
                    {selectedDayData.weekday_name} {formatPersianDateShort(selectedDayData.date)}
                  </h3>
                  <p className="text-xs text-gray-400 text-center mb-4">
                    بازه زمانی مورد نظر را انتخاب کنید
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedPeriod('morning')}
                      disabled={selectedDayData.morning_count === 0}
                      className={`p-4 rounded-xl border-2 text-center transition ${
                        selectedPeriod === 'morning'
                          ? 'border-medical-500 bg-medical-50 text-medical-700'
                          : selectedDayData.morning_count > 0
                          ? 'border-gray-200 text-gray-600 hover:border-medical-300 cursor-pointer'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🌅</span>
                      <p className="font-bold text-sm">صبح</p>
                      <p className="text-xs mt-1">
                        {selectedDayData.morning_count > 0
                          ? selectedDayData.morning_count < 10 ? `${selectedDayData.morning_count} نوبت` : ''
                          : 'ظرفیت کامل'}
                      </p>
                    </button>

                    <button
                      onClick={() => setSelectedPeriod('afternoon')}
                      disabled={selectedDayData.afternoon_count === 0}
                      className={`p-4 rounded-xl border-2 text-center transition ${
                        selectedPeriod === 'afternoon'
                          ? 'border-medical-500 bg-medical-50 text-medical-700'
                          : selectedDayData.afternoon_count > 0
                          ? 'border-gray-200 text-gray-600 hover:border-medical-300 cursor-pointer'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">☀️</span>
                      <p className="font-bold text-sm">ظهر</p>
                      <p className="text-xs mt-1">
                        {selectedDayData.afternoon_count > 0
                          ? selectedDayData.afternoon_count < 10 ? `${selectedDayData.afternoon_count} نوبت` : ''
                          : 'ظرفیت کامل'}
                      </p>
                    </button>
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={loading || !selectedPeriod}
                    className="btn-primary w-full mt-4"
                  >
                    {loading ? 'در حال ثبت...' : 'تایید و ثبت نوبت'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
