from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from extensions import db
from models import Appointment, User

secretary_bp = Blueprint('secretary', __name__)

@secretary_bp.route('/secretary/appointments', methods=['GET'])
@jwt_required()
def list_appointments():
    status = request.args.get('status', '')
    date = request.args.get('date', '')

    query = Appointment.query

    if status:
        query = query.filter_by(status=status)

    today = datetime.now().strftime('%Y-%m-%d')
    if date == 'today':
        query = query.filter_by(appointment_date=today)
    elif date:
        query = query.filter_by(appointment_date=date)

    appointments = query.order_by(Appointment.appointment_date, Appointment.appointment_time).all()
    result = []
    for a in appointments:
        patient = User.query.get(a.patient_id)
        result.append({
            'id': a.id,
            'patient_name': patient.full_name if patient else 'نامشخص',
            'patient_national_id': patient.national_id if patient else '',
            'patient_mobile': patient.mobile if patient else '',
            'patient_diseases': patient.underlying_diseases if patient else '',
            'date': a.appointment_date,
            'time': a.appointment_time,
            'status': a.status
        })
    return jsonify({'appointments': result})

@secretary_bp.route('/secretary/appointments/<int:appointment_id>/confirm', methods=['PATCH'])
@jwt_required()
def confirm_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404
    appointment.status = 'confirmed'
    db.session.commit()
    return jsonify({'message': 'نوبت تایید شد'})

@secretary_bp.route('/secretary/appointments/<int:appointment_id>/reject', methods=['PATCH'])
@jwt_required()
def reject_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404
    appointment.status = 'rejected'
    db.session.commit()
    return jsonify({'message': 'نوبت رد شد'})

@secretary_bp.route('/secretary/appointments/<int:appointment_id>/reschedule', methods=['PATCH'])
@jwt_required()
def reschedule_appointment(appointment_id):
    data = request.get_json()
    new_date = data.get('date', '').strip()
    new_time = data.get('time', '').strip()

    if not new_date or not new_time:
        return jsonify({'error': 'تاریخ و زمان جدید الزامی است'}), 400

    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404

    appointment.appointment_date = new_date
    appointment.appointment_time = new_time
    appointment.status = 'pending'
    db.session.commit()
    return jsonify({'message': 'نوبت تغییر یافت'})

@secretary_bp.route('/secretary/appointments/<int:appointment_id>/arrived', methods=['PATCH'])
@jwt_required()
def mark_arrived(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404
    appointment.status = 'confirmed'
    db.session.commit()
    return jsonify({'message': 'بیمار حضور یافت'})

@secretary_bp.route('/secretary/appointments/<int:appointment_id>/absent', methods=['PATCH'])
@jwt_required()
def mark_absent(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'error': 'نوبت یافت نشد'}), 404
    appointment.status = 'missed'
    db.session.commit()
    return jsonify({'message': 'بیمار غایب ثبت شد'})

@secretary_bp.route('/secretary/patients', methods=['GET'])
@jwt_required()
def search_patients():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'patients': []})

    patients = User.query.filter(
        User.role == 'patient'
    ).filter(
        db.or_(
            User.full_name.contains(q),
            User.national_id.contains(q),
            User.mobile.contains(q)
        )
    ).all()

    result = []
    for p in patients:
        appointments = Appointment.query.filter_by(patient_id=p.id)\
            .order_by(Appointment.appointment_date.desc()).limit(5).all()
        result.append({
            'id': p.id,
            'full_name': p.full_name,
            'national_id': p.national_id,
            'mobile': p.mobile,
            'underlying_diseases': p.underlying_diseases or '',
            'appointments': [{
                'id': a.id,
                'date': a.appointment_date,
                'time': a.appointment_time,
                'status': a.status
            } for a in appointments]
        })
    return jsonify({'patients': result})
