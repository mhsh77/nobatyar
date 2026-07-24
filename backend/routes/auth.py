from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    mobile = data.get('mobile', '').strip()
    password = data.get('password', '')

    if not mobile or not password:
        return jsonify({'error': 'موبایل و رمز عبور الزامی است'}), 400

    user = User.query.filter_by(mobile=mobile, role='patient').first()
    if not user:
        user = User.query.filter_by(mobile=mobile, role='doctor').first()
    if not user:
        user = User.query.filter_by(mobile=mobile, role='secretary').first()
    if not user:
        return jsonify({'error': 'کاربر یافت نشد'}), 404

    if not user.password_hash or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'رمز عبور اشتباه است'}), 401

    if user.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'full_name': user.full_name,
            'mobile': user.mobile,
            'role': user.role
        }
    })

@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'کاربر یافت نشد'}), 404
    return jsonify({
        'id': user.id,
        'full_name': user.full_name,
        'mobile': user.mobile,
        'national_id': user.national_id,
        'role': user.role
    })
