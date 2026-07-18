import { toJalaali, toGregorian as jalaaliToGregorian } from 'jalaali-js';

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function toJalaliDate(year, month, day) {
  const j = toJalaali(year, month, day);
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function formatPersianDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const j = toJalaliDate(y, m, d);
  return `${j.day} ${MONTHS[j.month - 1]} ${j.year}`;
}

export function formatPersianDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const j = toJalaliDate(y, m, d);
  return `${j.day} ${MONTHS[j.month - 1]}`;
}

export function toPersianDigits(str) {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (d) => persian[+d]);
}

export function toGregorian(jy, jm, jd) {
  const g = jalaaliToGregorian(jy, jm, jd);
  const y = g.gy;
  const m = String(g.gm).padStart(2, '0');
  const d = String(g.gd).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
