
from flask import Blueprint, request, jsonify
from extensions import db
from models import Comment, Post, User
from datetime import datetime, timedelta
import random
from sms_utils import send_otp_sms
from flask_jwt_extended import jwt_required, get_jwt_identity

comments_bp = Blueprint('comments', __name__, url_prefix='/api/comments')

def _staff_or_none():
    try:
        uid = get_jwt_identity()
        u = User.query.get(int(uid)) if uid else None
        return u if (u and u.role in ('doctor', 'secretary')) else None
    except Exception:
        return None

# In-memory OTP store for comments
otp_codes = {}

@comments_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    if not phone or not phone.isdigit() or len(phone) < 10:
        return jsonify({"success": False, "error": "شماره معتبر وارد کنید"}), 400
    code = str(random.randint(1000, 9999))
    otp_codes[phone] = {"code": code, "expires_at": datetime.utcnow() + timedelta(minutes=5)}
    try:
        send_otp_sms(phone, code)
    except:
        pass
    return jsonify({"success": True, "message": "کد ارسال شد"})

@comments_bp.route('/verify-otp', methods=['POST'])
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

@comments_bp.route('/<int:post_id>', methods=['GET'])
def get_comments(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "پست یافت نشد"}), 404
    top_comments = Comment.query.filter_by(post_id=post_id, approved=True, parent_id=None).order_by(Comment.created_at.desc()).all()
    result = []
    for c in top_comments:
        replies_list = []
        for r in c.replies.order_by(Comment.created_at.asc()).all():
            replies_list.append({
                "id": r.id, "name": r.name, "content": r.content,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
            })
        result.append({
            "id": c.id, "name": c.name, "content": c.content,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
            "replies": replies_list
        })
    return jsonify({"comments": result})

@comments_bp.route('/<int:post_id>', methods=['POST'])
def add_comment(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "پست یافت نشد"}), 404
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    content = (data.get("content") or "").strip()
    if not name or not content:
        return jsonify({"error": "نام و متن نظر الزامی است"}), 400
    # Verify OTP
    if not otp_codes.get(phone, {}).get("verified"):
        return jsonify({"error": "شماره تایید نشده"}), 400
    comment = Comment(post_id=post_id, name=name, phone=phone, content=content)
    db.session.add(comment)
    db.session.commit()
    # Clean OTP
    otp_codes.pop(phone, None)
    return jsonify({"success": True, "message": "نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده می‌شود"})

@comments_bp.route('/admin/<int:post_id>', methods=['GET'])
@jwt_required()
def get_all_comments(post_id):
    if not _staff_or_none():
        return jsonify({"error": "دسترسی غیرمجاز"}), 403
    top_comments = Comment.query.filter_by(post_id=post_id, parent_id=None).order_by(Comment.created_at.desc()).all()
    result = []
    for c in top_comments:
        replies_list = []
        for r in c.replies.order_by(Comment.created_at.asc()).all():
            replies_list.append({
                "id": r.id, "name": r.name, "phone": r.phone, "content": r.content,
                "approved": r.approved,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
                "is_reply": True
            })
        result.append({
            "id": c.id, "name": c.name, "phone": c.phone, "content": c.content,
            "approved": c.approved,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
            "replies": replies_list
        })
    return jsonify({"comments": result})

@comments_bp.route('/<int:comment_id>/reply', methods=['POST'])
@jwt_required()
def reply_comment(comment_id):
    if not _staff_or_none():
        return jsonify({"error": "دسترسی غیرمجاز"}), 403
    parent = Comment.query.get(comment_id)
    if not parent:
        return jsonify({"error": "یافت نشد"}), 404
    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "متن پاسخ الزامی است"}), 400
    
    reply = Comment(post_id=parent.post_id, name="دکتر حسین مرادی", phone="", content=content, approved=True, parent_id=comment_id)
    db.session.add(reply)
    db.session.commit()
    
    # Send SMS notification to commenter
    if parent.phone:
        try:
            from sms_utils import send_url_sms
            msg = (f"نظر شما در سایت دکتر حسین مرادی توسط دکتر پاسخ داده شد. " + f"https://moradipsy.ir/blog/{parent.post_id}")
            send_url_sms(parent.phone, msg)
        except:
            pass
    
    return jsonify({"success": True, "message": "پاسخ ثبت شد"})

@comments_bp.route('/<int:comment_id>/approve', methods=['PUT'])
@jwt_required()
def approve_comment(comment_id):
    if not _staff_or_none():
        return jsonify({"error": "دسترسی غیرمجاز"}), 403
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "یافت نشد"}), 404
    comment.approved = True
    db.session.commit()
    return jsonify({"success": True, "message": "تایید شد"})

@comments_bp.route('/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    if not _staff_or_none():
        return jsonify({"error": "دسترسی غیرمجاز"}), 403
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"error": "یافت نشد"}), 404
    db.session.delete(comment)
    db.session.commit()
    return jsonify({"success": True, "message": "حذف شد"})
