from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from extensions import db
from models import DoctorSchedule, ClosedDay, Appointment

schedule_bp = Blueprint('schedule', __name__)

WEEKDAYS = {
    '5': 'شنبه', '6': 'یکشنبه', '0': 'دوشنبه', '1': 'سه‌شنبه',
    '2': 'چهارشنبه', '3': 'پنجشنبه', '4': 'جمعه'
}

WEEKDAYS_LIST = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

def python_to_persian_weekday(py_wd):
    return (py_wd + 2) % 7

def get_available_slots_for_date(date_str, exclude_appointment_id=None):
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except:
        return []
    weekday = date_obj.weekday()
    schedules = DoctorSchedule.query.filter_by(weekday=weekday).all()
    if not schedules:
        return []
    closed = ClosedDay.query.filter_by(closed_date=date_str).first()
    if closed:
        return []
    all_slots = []
    for s in schedules:
        start_h, start_m = map(int, s.start_time.split(':'))
        end_h, end_m = map(int, s.end_time.split(':'))
        duration = s.visit_duration
        current = datetime(2020, 1, 1, start_h, start_m)
        end = datetime(2020, 1, 1, end_h, end_m)
        while current + timedelta(minutes=duration) <= end:
            t = current.strftime('%H:%M')
            if t not in all_slots:
                all_slots.append(t)
            current += timedelta(minutes=duration)
    query = Appointment.query.filter_by(appointment_date=date_str).filter(
        Appointment.status.in_(['pending', 'confirmed'])
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    booked = query.all()
    booked_times = set(a.appointment_time for a in booked)
    return [s for s in all_slots if s not in booked_times]

def migrate_extra_appointments():
    today = datetime.now().strftime('%Y-%m-%d')
    appointments = Appointment.query.filter(
        Appointment.appointment_date >= today
    ).filter(
        Appointment.status.in_(['pending', 'confirmed'])
    ).order_by(Appointment.id).all()

    moved = 0
    for a in appointments:
        date_str = a.appointment_date
        weekday = datetime.strptime(date_str, '%Y-%m-%d').weekday()
        has_schedule = len(DoctorSchedule.query.filter_by(weekday=weekday).all()) > 0
        closed = ClosedDay.query.filter_by(closed_date=date_str).first()
        is_valid = has_schedule and not closed

        if not is_valid:
            slots = get_available_slots_for_date(date_str)
            if slots:
                a.appointment_time = slots[0]
                db.session.commit()
                moved += 1
                continue

            for offset in range(1, 14):
                new_date = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=offset)
                new_date_str = new_date.strftime('%Y-%m-%d')
                slots = get_available_slots_for_date(new_date_str)
                if slots:
                    a.appointment_date = new_date_str
                    a.appointment_time = slots[0]
                    db.session.commit()
                    moved += 1
                    break
        else:
            schedule_slots = get_available_slots_for_date(date_str, exclude_appointment_id=a.id)
            all_schedule_slots = []
            for s in DoctorSchedule.query.filter_by(weekday=weekday).all():
                start_h, start_m = map(int, s.start_time.split(':'))
                end_h, end_m = map(int, s.end_time.split(':'))
                duration = s.visit_duration
                current = datetime(2020, 1, 1, start_h, start_m)
                end = datetime(2020, 1, 1, end_h, end_m)
                while current + timedelta(minutes=duration) <= end:
                    t = current.strftime('%H:%M')
                    if t not in all_schedule_slots:
                        all_schedule_slots.append(t)
                    current += timedelta(minutes=duration)
            if a.appointment_time not in all_schedule_slots:
                if schedule_slots:
                    a.appointment_time = schedule_slots[0]
                    db.session.commit()
                    moved += 1
            elif a.appointment_time not in schedule_slots:
                booked_set = set(
                    Appointment.query.filter_by(
                        appointment_date=date_str, appointment_time=a.appointment_time
                    ).filter(
                        Appointment.status.in_(['pending', 'confirmed']),
                        Appointment.id != a.id
                    ).all()
                )
                if len(booked_set) > 0 and schedule_slots:
                    a.appointment_time = schedule_slots[0]
                    db.session.commit()
                    moved += 1
    return moved

@schedule_bp.route('/schedule', methods=['GET'])
@jwt_required()
def get_schedule():
    schedules = DoctorSchedule.query.all()
    result = []
    for s in schedules:
        persian_wd = python_to_persian_weekday(s.weekday)
        result.append({
            'id': s.id,
            'weekday': persian_wd,
            'weekday_name': WEEKDAYS_LIST[persian_wd],
            'start_time': s.start_time,
            'end_time': s.end_time,
            'visit_duration': s.visit_duration
        })
    result.sort(key=lambda x: x['weekday'])
    return jsonify({'schedule': result})

@schedule_bp.route('/schedule', methods=['POST'])
@jwt_required()
def create_schedule():
    data = request.get_json()
    weekday = data.get('weekday')
    start_time = data.get('start_time', '').strip()
    end_time = data.get('end_time', '').strip()
    visit_duration = data.get('visit_duration', 20)

    if weekday is None or not start_time or not end_time:
        return jsonify({'error': 'تمامی فیلدها الزامی است'}), 400

    if start_time >= end_time:
        return jsonify({'error': 'زمان شروع باید قبل از پایان باشد'}), 400

    py_weekday = (weekday - 2) % 7
    schedule = DoctorSchedule(
        weekday=py_weekday,
        start_time=start_time,
        end_time=end_time,
        visit_duration=visit_duration
    )
    db.session.add(schedule)
    db.session.commit()
    moved = migrate_extra_appointments()
    msg = 'برنامه اضافه شد'
    if moved:
        msg += f' — {moved} نوبت به روز شد'
    return jsonify({'message': msg, 'id': schedule.id}), 201

@schedule_bp.route('/schedule/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    schedule = DoctorSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({'error': 'برنامه یافت نشد'}), 404
    db.session.delete(schedule)
    db.session.commit()
    moved = migrate_extra_appointments()
    msg = 'برنامه حذف شد'
    if moved:
        msg += f' — {moved} نوبت به روز شد'
    return jsonify({'message': msg})

@schedule_bp.route('/closed-days', methods=['GET'])
@jwt_required()
def get_closed_days():
    today = datetime.now().strftime('%Y-%m-%d')
    closed_days = ClosedDay.query.filter(ClosedDay.closed_date >= today)\
        .order_by(ClosedDay.closed_date).all()
    result = [{'id': d.id, 'date': d.closed_date, 'reason': d.reason or ''} for d in closed_days]
    return jsonify({'closed_days': result})

@schedule_bp.route('/closed-days', methods=['POST'])
@jwt_required()
def add_closed_day():
    data = request.get_json()
    closed_date = data.get('date', '').strip()
    reason = data.get('reason', '').strip()

    if not closed_date:
        return jsonify({'error': 'تاریخ الزامی است'}), 400

    existing = ClosedDay.query.filter_by(closed_date=closed_date).first()
    if existing:
        return jsonify({'error': 'این تاریخ قبلاً ثبت شده است'}), 400

    closed_day = ClosedDay(closed_date=closed_date, reason=reason)
    db.session.add(closed_day)
    db.session.commit()
    moved = migrate_extra_appointments()
    msg = 'روز تعطیل اضافه شد'
    if moved:
        msg += f' — {moved} نوبت به روز شد'
    return jsonify({'message': msg, 'id': closed_day.id}), 201

@schedule_bp.route('/closed-days/<int:day_id>', methods=['DELETE'])
@jwt_required()
def remove_closed_day(day_id):
    closed_day = ClosedDay.query.get(day_id)
    if not closed_day:
        return jsonify({'error': 'یافت نشد'}), 404
    db.session.delete(closed_day)
    db.session.commit()
    moved = migrate_extra_appointments()
    msg = 'روز تعطیل حذف شد'
    if moved:
        msg += f' — {moved} نوبت به روز شد'
    return jsonify({'message': msg})

@schedule_bp.route('/schedule/weekly-grid', methods=['GET'])
@jwt_required()
def get_weekly_grid():
    today = datetime.now()
    days_back = (today.weekday() - 5) % 7
    week_start = today - timedelta(days=days_back)

    grid = []
    all_times = []

    for day_offset in range(7):
        date_obj = week_start + timedelta(days=day_offset)
        date_str = date_obj.strftime('%Y-%m-%d')
        py_wd = date_obj.weekday()
        persian_wd = python_to_persian_weekday(py_wd)

        schedules = DoctorSchedule.query.filter_by(weekday=py_wd).all()
        has_schedule = len(schedules) > 0
        closed = ClosedDay.query.filter_by(closed_date=date_str).first()
        is_closed = closed is not None

        day_slots = []
        if has_schedule and not is_closed:
            for s in schedules:
                start_h, start_m = map(int, s.start_time.split(':'))
                end_h, end_m = map(int, s.end_time.split(':'))
                duration = s.visit_duration
                current = datetime(2020, 1, 1, start_h, start_m)
                end = datetime(2020, 1, 1, end_h, end_m)
                while current + timedelta(minutes=duration) <= end:
                    time_str = current.strftime('%H:%M')
                    if time_str not in day_slots:
                        day_slots.append(time_str)
                    current += timedelta(minutes=duration)

        booked_appts = Appointment.query.filter_by(appointment_date=date_str).filter(
            Appointment.status.in_(['pending', 'confirmed', 'completed', 'missed', 'rejected'])
        ).all()
        booked_by_time = {}
        for a in booked_appts:
            patient_name = 'نامشخص'
            patient = a.patient
            if patient:
                patient_name = patient.full_name
                if patient.underlying_diseases:
                    patient_name += f' ({patient.underlying_diseases})'
            t = a.appointment_time
            if t not in booked_by_time:
                booked_by_time[t] = []
            booked_by_time[t].append({
                'patient_name': patient_name,
                'status': a.status
            })

        slots_data = []
        for t in day_slots:
            if t in booked_by_time:
                for b in booked_by_time[t]:
                    slots_data.append({
                        'time': t,
                        'status': 'booked',
                        'patient_name': b['patient_name'],
                        'appointment_status': b['status']
                    })
            else:
                slots_data.append({
                    'time': t,
                    'status': 'available',
                    'patient_name': '',
                    'appointment_status': ''
                })

        extra_slots = []
        for t, bookings in booked_by_time.items():
            if t not in day_slots:
                for b in bookings:
                    extra_slots.append({
                        'time': t,
                        'status': 'booked',
                        'patient_name': b['patient_name'],
                        'appointment_status': b['status']
                    })

        grid.append({
            'day_index': persian_wd,
            'day_name': WEEKDAYS_LIST[persian_wd],
            'date': date_str,
            'has_schedule': has_schedule,
            'is_closed': is_closed,
            'slots': slots_data,
            'extra_slots': extra_slots
        })

        for s in day_slots:
            if s not in all_times:
                all_times.append(s)

    all_times.sort()
    return jsonify({'grid': grid, 'all_times': all_times})

@schedule_bp.route('/public/schedule', methods=['GET'])
def get_public_schedule():
    today = datetime.now()
    weekdays_fa = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    days = []
    for persian_wd in range(7):
        py_wd = (persian_wd - 2) % 7
        schedules = DoctorSchedule.query.filter_by(weekday=py_wd).all()
        has_schedule = len(schedules) > 0
        status = 'active'
        hours = ''
        if has_schedule:
            s = schedules[0]
            hours = f'{s.start_time} - {s.end_time}'
        else:
            status = 'inactive'

        days.append({
            'day_index': persian_wd,
            'day_name': weekdays_fa[persian_wd],
            'status': status,
            'hours': hours,
            'has_schedule': has_schedule
        })

    today_py = today.weekday()
    today_persian = python_to_persian_weekday(today_py)
    return jsonify({'days': days, 'today_index': today_persian})
