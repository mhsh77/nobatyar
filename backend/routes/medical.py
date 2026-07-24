from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import uuid
import json
from werkzeug.utils import secure_filename
from extensions import db
from models import MedicalRecord, Appointment, User
from config import get_uploads_dir

medical_bp = Blueprint('medical', __name__)

UPLOAD_FOLDER = get_uploads_dir()
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@medical_bp.route('/medical-records', methods=['POST'])
@jwt_required()
def create_medical_record():
    doctor_id = int(get_jwt_identity())
    doctor = User.query.get(doctor_id)
    if doctor.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    data = request.get_json(silent=True) if request.content_type and 'application/json' in request.content_type else request.form
    if isinstance(data, dict):
        patient_id = data.get('patient_id')
        appointment_id = data.get('appointment_id')
        visit_date = (data.get('visit_date') or '').strip()
        chief_complaint = (data.get('chief_complaint') or '').strip()
        history = (data.get('history') or '').strip()
        diagnosis = (data.get('diagnosis') or '').strip()
        treatment_plan = (data.get('treatment_plan') or '').strip()
        medications = (data.get('medications') or '').strip()
        insurance_company = (data.get('insurance_company') or '').strip()
        insurance_type = (data.get('insurance_type') or '').strip()
        notes = (data.get('notes') or '').strip()
    else:
        patient_id = data.get('patient_id', type=int)
        appointment_id = data.get('appointment_id', type=int)
        visit_date = data.get('visit_date', '').strip()
        chief_complaint = data.get('chief_complaint', '').strip()
        history = data.get('history', '').strip()
        diagnosis = data.get('diagnosis', '').strip()
        treatment_plan = data.get('treatment_plan', '').strip()
        medications = data.get('medications', '').strip()
        insurance_company = data.get('insurance_company', '').strip()
        insurance_type = data.get('insurance_type', '').strip()
        notes = data.get('notes', '').strip()

    if not patient_id or not visit_date:
        return jsonify({'error': 'بیمار و تاریخ ویزیت الزامی است'}), 400

    existing = None
    if appointment_id:
        existing = MedicalRecord.query.filter_by(appointment_id=appointment_id).first()

    if existing:
        existing.chief_complaint = chief_complaint or existing.chief_complaint
        existing.history = history or existing.history
        existing.diagnosis = diagnosis or existing.diagnosis
        existing.treatment_plan = treatment_plan or existing.treatment_plan
        existing.medications = medications or existing.medications
        existing.insurance_company = insurance_company or existing.insurance_company
        existing.insurance_type = insurance_type or existing.insurance_type
        existing.notes = notes or existing.notes
        existing.visit_date = visit_date
        existing.updated_at = datetime.utcnow()

        images = json.loads(existing.images) if existing.images else []
        uploaded = request.files.getlist('images')
        for file in uploaded:
            if file and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                fname = f'{uuid.uuid4().hex}.{ext}'
                file.save(os.path.join(UPLOAD_FOLDER, fname))
                images.append(fname)
        existing.images = json.dumps(images)
        db.session.commit()
        return jsonify({'message': 'پرونده پزشکی به‌روزرسانی شد', 'id': existing.id})

    images = []
    uploaded = request.files.getlist('images')
    for file in uploaded:
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            fname = f'{uuid.uuid4().hex}.{ext}'
            file.save(os.path.join(UPLOAD_FOLDER, fname))
            images.append(fname)

    if doctor.role == 'doctor':
        record_doctor_id = doctor_id
    else:
        _doc = User.query.filter_by(role='doctor').first()
        record_doctor_id = _doc.id if _doc else doctor_id

    record = MedicalRecord(
        patient_id=patient_id,
        doctor_id=record_doctor_id,
        appointment_id=appointment_id,
        visit_date=visit_date,
        chief_complaint=chief_complaint,
        history=history,
        diagnosis=diagnosis,
        treatment_plan=treatment_plan,
        medications=medications,
        insurance_company=insurance_company,
        insurance_type=insurance_type,
        notes=notes,
        images=json.dumps(images) if images else None
    )
    db.session.add(record)

    if appointment_id:
        appt = Appointment.query.get(appointment_id)
        if appt:
            appt.status = 'completed'

    db.session.commit()
    return jsonify({'message': 'پرونده پزشکی ایجاد شد', 'id': record.id}), 201

@medical_bp.route('/medical-records/recent', methods=['GET'])
@jwt_required()
def get_recent_records():
    records = MedicalRecord.query.order_by(MedicalRecord.created_at.desc()).limit(20).all()
    result = []
    for r in records:
        patient = User.query.get(r.patient_id)
        doc = User.query.get(r.doctor_id)
        result.append({
            'id': r.id,
            'patient_id': r.patient_id,
            'patient_name': patient.full_name if patient else '',
            'patient_mobile': patient.mobile if patient else '',
            'doctor_name': doc.full_name if doc else '',
            'appointment_id': r.appointment_id,
            'visit_date': r.visit_date,
            'diagnosis': r.diagnosis or '',
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else ''
        })
    return jsonify({'records': result})

@medical_bp.route('/medical-records/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient_records(patient_id):
    records = MedicalRecord.query.filter_by(patient_id=patient_id)\
        .order_by(MedicalRecord.visit_date.desc()).all()
    result = []
    for r in records:
        doc = User.query.get(r.doctor_id)
        result.append({
            'id': r.id,
            'patient_id': r.patient_id,
            'doctor_name': doc.full_name if doc else '',
            'appointment_id': r.appointment_id,
            'visit_date': r.visit_date,
            'chief_complaint': r.chief_complaint or '',
            'history': r.history or '',
            'diagnosis': r.diagnosis or '',
            'treatment_plan': r.treatment_plan or '',
            'medications': r.medications or '',
            'insurance_company': r.insurance_company or '',
            'insurance_type': r.insurance_type or '',
            'notes': r.notes or '',
            'images': json.loads(r.images) if r.images else [],
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else ''
        })
    return jsonify({'records': result})

@medical_bp.route('/medical-records/detail/<int:record_id>', methods=['GET'])
@jwt_required()
def get_record_detail(record_id):
    r = MedicalRecord.query.get(record_id)
    if not r:
        return jsonify({'error': 'پرونده یافت نشد'}), 404
    doc = User.query.get(r.doctor_id)
    patient = User.query.get(r.patient_id)
    return jsonify({
        'id': r.id,
        'patient_id': r.patient_id,
        'patient_name': patient.full_name if patient else '',
        'patient_national_id': patient.national_id if patient else '',
        'patient_mobile': patient.mobile if patient else '',
        'patient_diseases': patient.underlying_diseases if patient else '',
        'doctor_name': doc.full_name if doc else '',
        'appointment_id': r.appointment_id,
        'visit_date': r.visit_date,
        'chief_complaint': r.chief_complaint or '',
        'history': r.history or '',
        'diagnosis': r.diagnosis or '',
        'treatment_plan': r.treatment_plan or '',
        'medications': r.medications or '',
        'insurance_company': r.insurance_company or '',
        'insurance_type': r.insurance_type or '',
        'notes': r.notes or '',
        'images': json.loads(r.images) if r.images else [],
        'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else '',
        'updated_at': r.updated_at.strftime('%Y-%m-%d %H:%M') if r.updated_at else ''
    })

@medical_bp.route('/medical-records/update/<int:record_id>', methods=['PUT'])
@jwt_required()
def update_medical_record(record_id):
    doctor_id = int(get_jwt_identity())
    doctor = User.query.get(doctor_id)
    if doctor.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    r = MedicalRecord.query.get(record_id)
    if not r:
        return jsonify({'error': 'پرونده یافت نشد'}), 404

    data = request.get_json(silent=True) if request.content_type and 'application/json' in request.content_type else request.form
    r.chief_complaint = data.get('chief_complaint', r.chief_complaint or '').strip()
    r.history = data.get('history', r.history or '').strip()
    r.diagnosis = data.get('diagnosis', r.diagnosis or '').strip()
    r.treatment_plan = data.get('treatment_plan', r.treatment_plan or '').strip()
    r.medications = data.get('medications', r.medications or '').strip()
    r.insurance_company = data.get('insurance_company', r.insurance_company or '').strip()
    r.insurance_type = data.get('insurance_type', r.insurance_type or '').strip()
    r.notes = data.get('notes', r.notes or '').strip()
    r.visit_date = data.get('visit_date', r.visit_date).strip() if data.get('visit_date') else r.visit_date
    r.updated_at = datetime.utcnow()

    images = json.loads(r.images) if r.images else []
    uploaded = request.files.getlist('images')
    for file in uploaded:
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            fname = f'{uuid.uuid4().hex}.{ext}'
            file.save(os.path.join(UPLOAD_FOLDER, fname))
            images.append(fname)
    r.images = json.dumps(images)

    db.session.commit()
    return jsonify({'message': 'پرونده پزشکی به‌روزرسانی شد'})

@medical_bp.route('/medical-records/delete-image/<int:record_id>', methods=['DELETE'])
@jwt_required()
def delete_image(record_id):
    doctor_id = int(get_jwt_identity())
    doctor = User.query.get(doctor_id)
    if doctor.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    data = request.get_json()
    filename = data.get('filename', '')
    if not filename:
        return jsonify({'error': 'نام فایل الزامی است'}), 400

    r = MedicalRecord.query.get(record_id)
    if not r:
        return jsonify({'error': 'پرونده یافت نشد'}), 404

    images = json.loads(r.images) if r.images else []
    if filename in images:
        images.remove(filename)
        fpath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(fpath):
            os.remove(fpath)
    r.images = json.dumps(images) if images else None
    db.session.commit()
    return jsonify({'message': 'تصویر حذف شد'})

@medical_bp.route('/uploads/<filename>', methods=['GET'])
def get_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)
