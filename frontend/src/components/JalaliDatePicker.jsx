import React, { useState, useMemo } from 'react';
import { toJalaliDate, toGregorian } from '../utils/persianDate';

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export default function JalaliDatePicker({ value, onChange, label, className = '' }) {
  const todayJalali = useMemo(() => {
    const now = new Date();
    return toJalaliDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const jalali = useMemo(() => {
    if (!value) return { year: '', month: '', day: '' };
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return { year: '', month: '', day: '' };
    return toJalaliDate(y, m, d);
  }, [value]);

  const [open, setOpen] = useState(false);
  const [jYear, setJYear] = useState(jalali.year || '');
  const [jMonth, setJMonth] = useState(jalali.month || '');
  const [jDay, setJDay] = useState(jalali.day || '');

  const isPast = (y, m, d) => {
    if (y < todayJalali.year) return true;
    if (y > todayJalali.year) return false;
    if (m < todayJalali.month) return true;
    if (m > todayJalali.month) return false;
    return d < todayJalali.day;
  };

  const daysInMonth = useMemo(() => {
    if (!jMonth) return 31;
    const mm = Number(jMonth);
    if (mm <= 6) return 31;
    if (mm <= 11) return 30;
    if (jYear && ((((Number(jYear) + 11) % 33) % 4) === 0)) return 30;
    return 29;
  }, [jMonth, jYear]);

  const handleConfirm = () => {
    if (!jYear || !jMonth || !jDay) return;
    if (isPast(Number(jYear), Number(jMonth), Number(jDay))) return;
    onChange(toGregorian(Number(jYear), Number(jMonth), Number(jDay)));
    setOpen(false);
  };

  const displayDate = value ? `${jalali.day} ${MONTHS[(jalali.month || 1) - 1]} ${jalali.year}` : '';
  const yearOptions = Array.from({ length: 11 }, (_, i) => todayJalali.year + i);

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-gray-700 text-sm font-medium mb-1.5">{label}</label>}
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-right outline-none transition-all focus:border-medical-500 bg-gray-50 hover:bg-gray-100 flex items-center justify-between">
        <span className={displayDate ? 'text-gray-700' : 'text-gray-400'}>{displayDate || 'انتخاب تاریخ'}</span>
        <span className="text-gray-400">📅</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setJYear(jalali.year || ''); setJMonth(jalali.month || ''); setJDay(jalali.day || ''); setOpen(false); }} />
          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-full min-w-[280px]">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">سال</label>
                <select value={jYear} onChange={(e) => { setJYear(e.target.value); setJMonth(''); setJDay(''); }}
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-medical-500">
                  <option value="">سال</option>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ماه</label>
                <select value={jMonth} onChange={(e) => { setJMonth(e.target.value); setJDay(''); }}
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-medical-500">
                  <option value="">ماه</option>
                  {MONTHS.filter((_, i) => {
                    if (!jYear || Number(jYear) > todayJalali.year) return true;
                    return i + 1 >= todayJalali.month;
                  }).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">روز</label>
                <select value={jDay} onChange={(e) => setJDay(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-medical-500">
                  <option value="">روز</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1)
                    .filter((d) => {
                      if (!jYear || !jMonth) return true;
                      return !isPast(Number(jYear), Number(jMonth), d);
                    })
                    .map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleConfirm}
                disabled={!jYear || !jMonth || !jDay || isPast(Number(jYear), Number(jMonth), Number(jDay))}
                className="flex-1 py-2 bg-medical-600 text-white rounded-lg text-sm font-medium hover:bg-medical-700 transition disabled:opacity-40">تایید</button>
              <button type="button" onClick={() => { setJYear(jalali.year || ''); setJMonth(jalali.month || ''); setJDay(jalali.day || ''); setOpen(false); }}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">انصراف</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
