
from flask import Blueprint, request, jsonify
from extensions import db
from models import SurveyResponse
from datetime import datetime, timedelta
import random

feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')

otp_codes = {}

@feedback_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    if not phone or not phone.isdigit() or len(phone) < 10:
        return jsonify({"success": False, "error": "شماره معتبر وارد کنید"}), 400
    code = str(random.randint(1000, 9999))
    otp_codes[phone] = {"code": code, "expires_at": datetime.utcnow() + timedelta(minutes=5)}
    try:
        from sms_utils import send_otp_sms
        send_otp_sms(phone, code)
    except:
        pass
    return jsonify({"success": True, "message": "کد ارسال شد"})

@feedback_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    user_code = (data.get("code") or "").strip()
    stored = otp_codes.get(phone)
    if not stored:
        return jsonify({"success": False, "error": "کدی ارسال نشده"}), 400
    if datetime.utcnow() > stored["expires_at"]:
        otp_codes.pop(phone, None)
        return jsonify({"success": False, "error": "کد منقضی شد"}), 400
    if stored["code"] != user_code:
        return jsonify({"success": False, "error": "کد نامعتبر"}), 400
    otp_codes[phone]["verified"] = True
    return jsonify({"success": True, "message": "تایید شد"})

@feedback_bp.route('/submit', methods=['POST'])
def submit():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    rating = int(data.get("rating", 5))
    content = (data.get("content") or "").strip()
    if not name or not content:
        return jsonify({"success": False, "error": "نام و متن نظر الزامی است"}), 400
    if not otp_codes.get(phone, {}).get("verified"):
        return jsonify({"success": False, "error": "شماره تایید نشده"}), 400
    resp = SurveyResponse(name=name, phone=phone, rating=rating, content=content)
    db.session.add(resp)
    db.session.commit()
    otp_codes.pop(phone, None)
    return jsonify({"success": True, "message": "نظر شما ثبت شد"})

@feedback_bp.route('/list', methods=['GET'])
def list_responses():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '').strip()
    query = SurveyResponse.query.order_by(SurveyResponse.created_at.desc())
    if search:
        query = query.filter(
            db.or_(
                SurveyResponse.name.ilike(f'%{search}%'),
                SurveyResponse.phone.ilike(f'%{search}%'),
                SurveyResponse.content.ilike(f'%{search}%')
            )
        )
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    result = [{
        "id": r.id, "name": r.name, "phone": r.phone, "rating": r.rating,
        "content": r.content,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
    } for r in pagination.items]
    return jsonify({"responses": result, "total": pagination.total, "page": page, "pages": pagination.pages})

@feedback_bp.route('/<int:resp_id>', methods=['DELETE'])
def delete_resp(resp_id):
    resp = SurveyResponse.query.get(resp_id)
    if not resp:
        return jsonify({"error": "یافت نشد"}), 404
    db.session.delete(resp)
    db.session.commit()
    return jsonify({"success": True, "message": "حذف شد"})
