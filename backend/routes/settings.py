from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
import os
import uuid
from extensions import db
from models import SiteSetting
from config import get_uploads_dir

settings_bp = Blueprint('settings', __name__)

UPLOAD_FOLDER = get_uploads_dir()
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@settings_bp.route('/settings', methods=['GET'])
def get_settings():
    all_settings = SiteSetting.query.all()
    result = {s.key: s.value for s in all_settings if not s.key.startswith('chatbot_')}
    return jsonify({'settings': result})

@settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'داده‌ای ارسال نشده'}), 400

    for key, value in data.items():
        setting = SiteSetting.query.filter_by(key=key).first()
        if setting:
            setting.value = str(value) if value is not None else ''
        else:
            setting = SiteSetting(key=key, value=str(value) if value is not None else '')
            db.session.add(setting)
    db.session.commit()
    return jsonify({'message': 'تنظیمات ذخیره شد'})

@settings_bp.route('/settings/upload/<key>', methods=['POST'])
@jwt_required()
def upload_setting_image(key):
    if key not in ('hero_doctor_image', 'about_clinic_image'):
        return jsonify({'error': 'کلید نامعتبر است'}), 400

    if 'image' not in request.files:
        return jsonify({'error': 'فایلی ارسال نشده'}), 400

    file = request.files['image']
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'فرمت فایل مجاز نیست (png, jpg, jpeg, gif, webp)'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    fname = f'site_{key}_{uuid.uuid4().hex}.{ext}'
    file.save(os.path.join(UPLOAD_FOLDER, fname))

    setting = SiteSetting.query.filter_by(key=key).first()
    if setting:
        setting.value = f'/api/uploads/{fname}'
    else:
        setting = SiteSetting(key=key, value=f'/api/uploads/{fname}')
        db.session.add(setting)
    db.session.commit()

    return jsonify({'message': 'تصویر آپلود شد', 'url': f'/api/uploads/{fname}'})
