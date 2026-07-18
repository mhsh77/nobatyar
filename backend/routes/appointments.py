from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from extensions import db
from models import Appointment, User, DoctorSchedule, ClosedDay

appointment_bp = Blueprint('appointments', __name__)

WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

def python_weekday_to_persian(py_weekday):
    return (py_weekday + 2) % 7

def generate_slots(date_str):
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except:
        return []

    if date_obj.date() <= datetime.now().date():
        existing_today = Appointment.query.filter_by(
            appointment_date=date_str, status='pending'
        ).first()
        if date_obj.date() < datetime.now().date() and not existing_today:
            return []

    weekday = date_obj.weekday()
    schedules = DoctorSchedule.query.filter_by(weekday=weekday).all()
    if not schedules:
        return []

    closed = ClosedDay.query.filter_by(closed_date=date_str).first()
    if closed:
        return []

    all_slots = []
    for schedule in schedules:
        start_h, start_m = map(int, schedule.start_time.split(':'))
        end_h, end_m = map(int, schedule.end_time.split(':'))
        duration = schedule.visit_duration
        current = datetime(2020, 1, 1, start_h, start_m)
        end = datetime(2020, 1, 1, end_h, end_m)
        while current + timedelta(minutes=duration) <= end:
            time_str = current.strftime('%H:%M')
            all_slots.append(time_str)
            current += timedelta(minutes=duration)

    booked = Appointment.query.filter_by(
        appointment_date=date_str
    ).filter(
        Appointment.status.in_(['pending', 'confirmed'])
    ).all()
    booked_times = set(a.appointment_time for a in booked)

    available = [s for s in all_slots if s not in booked_times]
    return available

def count_by_period(slots):
    morning = [s for s in slots if s < '13:00']
    afternoon = [s for s in slots if s >= '13:00']
    return len(morning), len(afternoon)

@appointment_bp.route('/appointments/days', methods=['GET'])
def get_available_days():
    today = datetime.now()
    days_data = []
    for i in range(14):
        date_obj = today + timedelta(days=i)
        if date_obj.date() <= today.date():
            continue
        date_str = date_obj.strftime('%Y-%m-%d')
        weekday = date_obj.weekday()

        schedules = DoctorSchedule.query.filter_by(weekday=weekday).all()
        has_schedule = len(schedules) > 0

        closed_day = ClosedDay.query.filter_by(closed_date=date_str).first()
        is_closed = closed_day is not None

        slots = generate_slots(date_str) if has_schedule and not is_closed else []
        morning, afternoon = count_by_period(slots)
        total = morning + afternoon

        status = 'available'
        status_text = ''
        if not has_schedule:
            status = 'no_schedule'
            status_text = 'تعطیل پزشک'
        elif is_closed:
            status = 'closed'
            status_text = 'تعطیل'
        elif total == 0:
            status = 'full'
            status_text = 'ظرفیت کامل'

        persian_weekday = python_weekday_to_persian(weekday)
        days_data.append({
            'date': date_str,
            'weekday': persian_weekday,
            'weekday_name': WEEKDAYS_FA[persian_weekday],
            'has_schedule': has_schedule,
            'is_closed': is_closed,
            'status': status,
            'status_text': status_text,
            'total_available': total,
            'morning_count': morning,
            'afternoon_count': afternoon,
        })
    return jsonify({'days': days_data})

@appointment_bp.route('/appointments/slots', methods=['GET'])
def get_slots():
    date_str = request.args.get('date', '')
    if not date_str:
        return jsonify({'error': 'تاریخ الزامی است'}), 400
    slots = generate_slots(date_str)
    morning, afternoon = count_by_period(slots)
    return jsonify({
        'slots': slots,
        'date': date_str,
        'morning_count': morning,
        'afternoon_count': afternoon,
        'total_available': len(slots)
    })

@appointment_bp.route('/appointments/book', methods=['POST'])
def book_appointment():
    data = request.get_json()
    patient_id = data.get('patient_id')
    date_str = data.get('date', '').strip()
    period = data.get('period', '').strip()

    if not patient_id or not date_str or not period:
        return jsonify({'error': 'تمامی فیلدها الزامی است'}), 400

    if period not in ('morning', 'afternoon'):
        return jsonify({'error': 'نوع نوبت صبح یا ظهر را انتخاب کنید'}), 400

    patient = User.query.get(patient_id)
    if not patient or patient.role != 'patient':
        return jsonify({'error': 'بیمار یافت نشد'}), 404

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        if date_obj.date() < datetime.now().date():
            return jsonify({'error': 'تاریخ گذشته قابل انتخاب نیست'}), 400
    except:
        return jsonify({'error': 'فرمت تاریخ نامعتبر است'}), 400

    closed = ClosedDay.query.filter_by(closed_date=date_str).first()
    if closed:
        return jsonify({'error': 'این روز تعطیل است'}), 400

    available = generate_slots(date_str)
    if period == 'morning':
        period_slots = [s for s in available if s < '13:00']
    else:
        period_slots = [s for s in available if s >= '13:00']

    if not period_slots:
        return jsonify({'error': 'هیچ نوبت خالی در این بازه وجود ندارد'}), 400

    assigned_time = period_slots[0]

    appointment = Appointment(
        patient_id=patient_id,
        appointment_date=date_str,
        appointment_time=assigned_time,
        status='pending'
    )
    db.session.add(appointment)
    db.session.commit()

    return jsonify({
        'message': 'نوبت با موفقیت ثبت شد',
        'appointment': {
            'id': appointment.id,
            'date': appointment.appointment_date,
            'time': appointment.appointment_time,
            'status': appointment.status,
            'patient_name': patient.full_name
        }
    })

@appointment_bp.route('/appointments/last', methods=['GET'])
@appointment_bp.route('/appointments/last/<int:patient_id>', methods=['GET'])
def get_last_appointment(patient_id=None):
    if not patient_id:
        mobile = request.args.get('mobile', '').strip()
        if not mobile:
            return jsonify({'error': 'شناسه بیمار الزامی است'}), 400
        user = User.query.filter_by(mobile=mobile).first()
        if not user:
            return jsonify({'error': 'بیمار یافت نشد'}), 404
        patient_id = user.id

    appointment = Appointment.query.filter_by(patient_id=patient_id)\
        .order_by(Appointment.id.desc()).first()
    if not appointment:
        return jsonify({'error': 'نوبتی یافت نشد'}), 404

    patient = User.query.get(patient_id)
    return jsonify({
        'appointment': {
            'id': appointment.id,
            'date': appointment.appointment_date,
            'time': appointment.appointment_time,
            'status': appointment.status,
            'patient_name': patient.full_name,
            'patient_mobile': patient.mobile
        }
    })

@appointment_bp.route('/appointments/today', methods=['GET'])
@jwt_required()
def get_today_appointments():
    today = datetime.now().strftime('%Y-%m-%d')
    appointments = Appointment.query.filter_by(appointment_date=today)\
        .order_by(Appointment.appointment_time).all()
    return jsonify({'appointments': serialize_appointments(appointments), 'date': today})

@appointment_bp.route('/appointments/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_appointments():
    today = datetime.now().strftime('%Y-%m-%d')
    status = request.args.get('status', '')
    query = Appointment.query.filter(Appointment.appointment_date >= today)
    if status:
        query = query.filter(Appointment.status == status)
    appointments = query.order_by(Appointment.appointment_date, Appointment.appointment_time).all()
    return jsonify({'appointments': serialize_appointments(appointments)})

@appointment_bp.route('/appointments/next', methods=['GET'])
@jwt_required()
def get_next_patient():
    today = datetime.now().strftime('%Y-%m-%d')
    now_time = datetime.now().strftime('%H:%M')
    appointment = Appointment.query.filter(
        Appointment.appointment_date == today,
        Appointment.appointment_time >= now_time,
        Appointment.status.in_(['pending', 'confirmed'])
    ).order_by(Appointment.appointment_time).first()

    if not appointment:
        return jsonify({'appointment': None})
    patient = User.query.get(appointment.patient_id)
    return jsonify({
        'appointment': {
            'id': appointment.id,
            'time': appointment.appointment_time,
            'patient_name': patient.full_name,
            'patient_mobile': patient.mobile,
            'status': appointment.status
        }
    })

@appointment_bp.route('/appointments/count/today', methods=['GET'])
@jwt_required()
def get_today_count():
    today = datetime.now().strftime('%Y-%m-%d')
    count = Appointment.query.filter_by(appointment_date=today).count()
    pending = Appointment.query.filter_by(appointment_date=today, status='pending').count()
    completed = Appointment.query.filter_by(appointment_date=today, status='completed').count()
    missed = Appointment.query.filter_by(appointment_date=today, status='missed').count()
    return jsonify({'total': count, 'pending': pending, 'completed': completed, 'missed': missed})

@appointment_bp.route('/appointments/<int:appointment_id>/status', methods=['PATCH'])
@jwt_required()
def update_appointment_status(appointment_id):
    data = request.get_json()
    status = data.get('status', '').strip()
    if status not in ('completed', 'missed', 'confirmed', 'rejected'):
        return jsonify({'error': 'وضعیت نامعتبر است'}), 400

    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404

    appointment.status = status
    db.session.commit()
    return jsonify({'message': 'وضعیت به‌روزرسانی شد', 'status': status})

def serialize_appointments(appointments):
    result = []
    for a in appointments:
        patient = User.query.get(a.patient_id)
        result.append({
            'id': a.id,
            'patient_id': a.patient_id,
            'patient_name': patient.full_name if patient else 'نامشخص',
            'patient_national_id': patient.national_id if patient else '',
            'patient_mobile': patient.mobile if patient else '',
            'patient_diseases': patient.underlying_diseases if patient else '',
            'date': a.appointment_date,
            'time': a.appointment_time,
            'status': a.status
        })
    return result
