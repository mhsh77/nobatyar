from flask import Blueprint, request, jsonify
from sms_utils import send_booking_sms
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

def gregorian_to_jalali(date_str):
    try:
        gy, gm, gd = map(int, date_str.split('-'))
        base = datetime(2025, 3, 21)
        diff = (datetime(gy, gm, gd).date() - base.date()).days
        jy, r = 1404, diff
        while r >= 365:
            jy += 1
            yr = 366 if ((((jy + 11) % 33) % 4) == 0) else 365
            if r >= yr: r -= yr
            else: break
        md = [31]*6 + [30]*5 + [29]
        if ((((jy + 11) % 33) % 4) == 0): md[-1] = 30
        jm, jd = 1, r
        for m in md:
            if jd >= m: jd -= m; jm += 1
            else: break
        return str(jy) + '/' + str(jm).zfill(2) + '/' + str(jd + 1).zfill(2)
    except:
        return date_str

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

    # Convert to Jalali date for SMS
    try:
        gy, gm, gd = map(int, appointment.appointment_date.split('-'))
        # Simple Jalali conversion
        base_gy, base_gm, base_gd = 2025, 3, 21  # Farvardin 1, 1404
        base_jy = 1404
        days_diff = (date_obj.date() - datetime(base_gy, base_gm, base_gd).date()).days
        
        jy = base_jy
        remaining = days_diff
        while remaining >= 365:
            jy += 1
            leap = ((((jy + 11) % 33) % 4) == 0)
            ydays = 366 if leap else 365
            if remaining >= ydays:
                remaining -= ydays
            else:
                break
            if remaining < 365:
                break
        
        if remaining < 0:
            jy = base_jy - 1
            leap = ((((jy + 11) % 33) % 4) == 0)
            remaining = (366 if leap else 365) + remaining
        
        jm_days = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
        leap = ((((jy + 11) % 33) % 4) == 0)
        if leap:
            jm_days[11] = 30
        jm = 1
        for md in jm_days:
            if remaining >= md:
                remaining -= md
                jm += 1
            else:
                break
        jd = remaining + 1
        jalali_date = f"{jy}/{jm:02d}/{jd:02d}"
    except:
        jalali_date = appointment.appointment_date
    
    # Send SMS to patient with Jalali date
    send_booking_sms(patient.mobile, patient.full_name, jalali_date, appointment.appointment_time, str(appointment.id))
    
    # Send SMS to doctor
    # Send SMS to doctor via template 580012
    try:
        from sms_utils import send_doctor_sms
        # Notify every doctor-role account (real doctor + demo/admin accounts)
        for doc in User.query.filter_by(role='doctor').all():
            if doc and doc.mobile:
                send_doctor_sms(doc.mobile, patient.full_name, jalali_date, appointment.appointment_time)
    except:
        pass

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
    confirmed = Appointment.query.filter_by(appointment_date=today, status='confirmed').count()
    return jsonify({'total': count, 'pending': pending, 'completed': completed, 'missed': missed, 'confirmed': confirmed})

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

    # Update time if provided
    if status == 'confirmed' and data.get('time'):
        appointment.appointment_time = data['time']
    
    appointment.status = status
    db.session.commit()
    
    # Send approve SMS when confirmed
    if status == 'confirmed':
        try:
            patient = User.query.get(appointment.patient_id)
            if patient and patient.mobile:
                from sms_utils import send_approve_sms
                jdate = gregorian_to_jalali(appointment.appointment_date)
                send_approve_sms(patient.mobile, patient.full_name, jdate, appointment.appointment_time, str(appointment.id))
        except:
            pass
    if status == 'rejected':
        try:
            patient = User.query.get(appointment.patient_id)
            if patient and patient.mobile:
                from sms_utils import send_cancel_sms
                send_cancel_sms(patient.mobile, patient.full_name, gregorian_to_jalali(appointment.appointment_date))
        except:
            pass
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
