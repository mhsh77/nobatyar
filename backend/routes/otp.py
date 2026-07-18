from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random
import urllib.request
import urllib.parse
from extensions import db, bcrypt
from models import OtpCode, User
from config import Config

otp_bp = Blueprint('otp', __name__)

def send_sms(mobile, text):
    params = urllib.parse.urlencode({
        'username': Config.SMS_IR_USERNAME,
        'password': Config.SMS_IR_PASSWORD,
        'line': Config.SMS_IR_LINE,
        'mobile': mobile,
        'text': text
    })
    url = f'https://api.sms.ir/v1/send?{params}'
    try:
        urllib.request.urlopen(url, timeout=10)
    except Exception as e:
        print(f'SMS send error: {e}')

@otp_bp.route('/otp/send', methods=['POST'])
def send_otp():
    data = request.get_json()
    mobile = data.get('mobile', '').strip()
    full_name = data.get('full_name', '').strip()
    national_id = data.get('national_id', '').strip()
    underlying_diseases = data.get('underlying_diseases', '').strip()

    if not mobile or not full_name or not national_id:
        return jsonify({'error': 'تمامی فیلدهای اجباری را پر کنید'}), 400

    existing = User.query.filter_by(mobile=mobile).first()
    if not existing:
        existing = User.query.filter_by(national_id=national_id).first()

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(seconds=Config.OTP_EXPIRE_SECONDS)

    otp = OtpCode(mobile=mobile, otp_code=otp_code, expires_at=expires_at)
    db.session.add(otp)
    db.session.commit()

    print(f'[OTP] Mobile: {mobile} - Code: {otp_code}')
    # send_sms(mobile, text)  # SMS disabled for testing

    return jsonify({
        'message': 'کد تایید ارسال شد',
        'expires_in': Config.OTP_EXPIRE_SECONDS,
        'otp_code': otp_code
    })

@otp_bp.route('/otp/verify', methods=['POST'])
def verify_otp():
    data = request.get_json()
    mobile = data.get('mobile', '').strip()
    otp_code = data.get('otp_code', '').strip()
    full_name = data.get('full_name', '').strip()
    national_id = data.get('national_id', '').strip()
    underlying_diseases = data.get('underlying_diseases', '').strip()

    if not mobile or not otp_code:
        return jsonify({'error': 'موبایل و کد تایید الزامی است'}), 400

    otp = OtpCode.query.filter_by(mobile=mobile, otp_code=otp_code, verified=False)\
        .order_by(OtpCode.id.desc()).first()

    if not otp:
        return jsonify({'error': 'کد تایید نامعتبر است'}), 400

    if datetime.utcnow() > otp.expires_at:
        return jsonify({'error': 'کد تایید منقضی شده است'}), 400

    otp.verified = True
    db.session.commit()

    existing = User.query.filter_by(mobile=mobile).first()
    if not existing:
        existing = User.query.filter_by(national_id=national_id).first()

    if not existing:
        user = User(
            full_name=full_name,
            national_id=national_id,
            mobile=mobile,
            role='patient',
            underlying_diseases=underlying_diseases
        )
        db.session.add(user)
        db.session.commit()
        user_id = user.id
    else:
        existing.full_name = full_name
        existing.underlying_diseases = underlying_diseases
        db.session.commit()
        user_id = existing.id

    return jsonify({'message': 'تایید شد', 'user_id': user_id, 'mobile': mobile})
