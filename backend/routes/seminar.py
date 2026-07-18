from flask import Blueprint, request, jsonify, render_template
from extensions import db
from datetime import datetime, timedelta
import random, urllib.request, json


def send_sms_verify(mobile, code):
    try:
        from config import Config
        post_data = json.dumps({
            'mobile': mobile,
            'templateId': Config.SMS_IR_TEMPLATE_OTP,
            'parameters': [{'name': 'Code', 'value': code}]
        }).encode()
        req = urllib.request.Request(
            'https://api.sms.ir/v1/send/verify',
            data=post_data,
            headers={
                'Content-Type': 'application/json',
                'x-api-key': Config.SMS_IR_API_KEY
            }
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f'SMS send error: {e}')
        return False

# In-memory OTP store
otp_codes = {}

def generate_otp():
    return str(random.randint(1000, 9999))

seminar_bp = Blueprint("seminar", __name__, url_prefix="/seminar")


class SeminarRegistration(db.Model):
    __tablename__ = "seminar_registrations"
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    is_student = db.Column(db.Boolean, default=False)
    field_of_study = db.Column(db.String(200), nullable=True)
    semester = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


@seminar_bp.route("/api/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    if not phone or not phone.isdigit() or len(phone) < 10:
        return jsonify({"success": False, "error": "شماره تماس معتبر وارد کنید"}), 400
    otp_codes.pop(phone, None)
    code = generate_otp()
    otp_codes[phone] = {"code": code, "expires_at": datetime.utcnow() + timedelta(minutes=5)}
    # Send real SMS via sms.ir verify API
    sent = send_sms_verify(phone, code)
    if not sent:
        return jsonify({"success": False, "error": "خطا در ارسال پیامک، لطفا دوباره تلاش کنید"}), 500
    return jsonify({"success": True, "message": "کد تایید ارسال شد"})

@seminar_bp.route("/api/verify-otp", methods=["POST"])
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

@seminar_bp.route("/register", methods=["GET"])
def registration_form():
    return render_template("seminar_register.html")


@seminar_bp.route("/api/register", methods=["POST"])
def submit_registration():
    # Parse data from JSON or form
    data = request.get_json(silent=True)
    if not data:
        data = request.form.to_dict()
    if not data:
        try:
            import json as _json
            data = _json.loads(request.data)
        except Exception:
            data = {}

    # Verify OTP
    phone_check = (data.get("phone") or "").strip()
    if phone_check and otp_codes.get(phone_check, {}).get("verified") != True:
        return jsonify({"success": False, "errors": ["لطفا ابتدا شماره خود را تایید کنید"]}), 400

    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    is_student = data.get("is_student") in ("true", "True", "1", "on", True)
    field_of_study = (data.get("field_of_study") or "").strip()
    semester = (data.get("semester") or "").strip()

    errors = []
    if not first_name:
        errors.append("\u0646\u0627\u0645 \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a")
    if not last_name:
        errors.append("\u0646\u0627\u0645 \u062e\u0627\u0646\u0648\u0627\u062f\u06af\u06cc \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a")
    if not phone:
        errors.append("\u0634\u0645\u0627\u0631\u0647 \u062a\u0645\u0627\u0633 \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a")
    elif not phone.isdigit() or len(phone) < 10:
        errors.append("\u0634\u0645\u0627\u0631\u0647 \u062a\u0645\u0627\u0633 \u0645\u0639\u062a\u0628\u0631 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f")
    if is_student:
        if not field_of_study:
            errors.append("\u0644\u0637\u0641\u0627\u064b \u0631\u0634\u062a\u0647 \u062a\u062d\u0635\u06cc\u0644\u06cc \u062e\u0648\u062f \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f")
        if not semester:
            errors.append("\u0644\u0637\u0641\u0627\u064b \u062a\u0631\u0645 \u062a\u062d\u0635\u06cc\u0644\u06cc \u062e\u0648\u062f \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f")
    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    reg = SeminarRegistration(
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        is_student=is_student,
        field_of_study=field_of_study if is_student else None,
        semester=semester if is_student else None,
    )
    db.session.add(reg)
    db.session.commit()
    return jsonify({"success": True, "message": "\u062b\u0628\u062a\u200c\u0646\u0627\u0645 \u0634\u0645\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0627\u0646\u062c\u0627\u0645 \u0634\u062f."})


@seminar_bp.route("/api/registrations", methods=["GET"])
def list_registrations():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    search = request.args.get("search", "").strip()
    query = SeminarRegistration.query.order_by(SeminarRegistration.created_at.desc())
    if search:
        query = query.filter(
            db.or_(
                SeminarRegistration.first_name.ilike(f"%{search}%"),
                SeminarRegistration.last_name.ilike(f"%{search}%"),
                SeminarRegistration.phone.ilike(f"%{search}%"),
            )
        )
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    result = [
        {
            "id": r.id,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "phone": r.phone,
            "is_student": r.is_student,
            "field_of_study": r.field_of_study or "",
            "semester": r.semester or "",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        }
        for r in pagination.items
    ]
    return jsonify({"registrations": result, "total": pagination.total, "page": page, "pages": pagination.pages})


@seminar_bp.route("/admin", methods=["GET"])

@seminar_bp.route("/api/register/<int:reg_id>", methods=["DELETE"])
def delete_registration(reg_id):
    reg = SeminarRegistration.query.get(reg_id)
    if not reg:
        return jsonify({"success": False, "error": "ثبت‌نام یافت نشد"}), 404
    db.session.delete(reg)
    db.session.commit()
    return jsonify({"success": True, "message": "حذف شد"})

def admin_page():
    return render_template("seminar_admin.html")
