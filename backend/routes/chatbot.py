from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime
import json
import random
import traceback
from openai import OpenAI
from extensions import db
from models import ChatbotMessage, SiteSetting, User

chatbot_bp = Blueprint('chatbot', __name__)

RESPONSES = {
    'سلام': 'سلام! من دستیار هوشمند مطب دکتر حسین مرادی هستم. چطور می‌توانم به شما کمک کنم؟',
    'خوبی': 'خوب هستم، ممنون! چطور می‌توانم کمکتان کنم؟',
    'نوبت': 'برای رزرو نوبت می‌توانید از بخش «رزرو نوبت» در سایت استفاده کنید. اگر نیاز به راهنمایی دارید، بپرسید.',
    'دکتر': 'دکتر حسین مرادی، روانشناس بالینی هستند. برای اطلاعات بیشتر به بخش «درباره ما» مراجعه کنید.',
    'روانشناس': 'دکتر حسین مرادی، روانشناس بالینی هستند. برای اطلاعات بیشتر به بخش «درباره ما» مراجعه کنید.',
    'آدرس': 'برای مشاهده آدرس و اطلاعات تماس لطفاً به بخش «ارتباط با ما» در سایت مراجعه کنید.',
    'تلفن': 'برای شماره تماس لطفاً به بخش «ارتباط با ما» در سایت مراجعه کنید.',
    'ساعت': 'ساعات کاری مطب در بخش «ارتباط با ما» و صفحه اصلی سایت درج شده است.',
    'هزینه': 'برای اطلاع از هزینه ویزیت لطفاً با مطب تماس بگیرید.',
    'بیمه': 'برای اطلاع از وضعیت بیمه لطفاً با مطب تماس بگیرید.',
    'تشکر': 'خواهش می‌کنم! همیشه در خدمت شما هستیم.',
    'خداحافظ': 'خداحافظ! روز خوبی داشته باشید و سلامت باشید.',
}

def get_response(message):
    message_lower = message.replace(' ', '').replace('‌', '')
    for keyword, response in RESPONSES.items():
        if keyword in message_lower:
            return response
    return 'متوجه شدم. لطفاً سوالتان را دقیق‌تر بپرسید یا با مطب تماس بگیرید. در صورت نیاز به رزرو نوبت می‌توانید از بخش رزرو نوبت استفاده کنید.'

@chatbot_bp.route('/chatbot/settings', methods=['GET'])
def get_chatbot_settings():
    settings = SiteSetting.query.filter(SiteSetting.key.like('chatbot_%')).all()
    result = {s.key.replace('chatbot_', ''): s.value for s in settings}
    show_key = False
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            u = User.query.get(int(uid))
            show_key = bool(u and u.role in ('doctor', 'secretary'))
    except Exception:
        show_key = False
    return jsonify({
        'enabled': result.get('enabled', 'false') == 'true',
        'prompt': result.get('prompt', ''),
        'title': result.get('title', 'چت با دستیار هوشمند'),
        'greeting': result.get('greeting', 'سلام! من دستیار هوشمند مطب دکتر هستم. چطور می‌توانم به شما کمک کنم؟'),
        'api_key': result.get('api_key', '') if show_key else '',
    })

@chatbot_bp.route('/chatbot/settings', methods=['PUT'])
@jwt_required()
def update_chatbot_settings():
    doctor_id = int(get_jwt_identity())
    doctor = User.query.get(doctor_id)
    if doctor.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'داده‌ای ارسال نشده'}), 400

    for key, value in data.items():
        db_key = f'chatbot_{key}'
        setting = SiteSetting.query.filter_by(key=db_key).first()
        if setting:
            setting.value = str(value)
        else:
            db.session.add(SiteSetting(key=db_key, value=str(value)))
    db.session.commit()
    return jsonify({'message': 'تنظیمات چت‌بات ذخیره شد'})

@chatbot_bp.route('/chatbot/messages', methods=['GET'])
def get_messages():
    messages = ChatbotMessage.query.order_by(ChatbotMessage.created_at.asc()).limit(50).all()
    return jsonify({
        'messages': [{
            'id': m.id,
            'sender': m.sender,
            'message': m.message,
            'created_at': m.created_at.strftime('%H:%M') if m.created_at else ''
        } for m in messages]
    })

@chatbot_bp.route('/chatbot/messages', methods=['POST'])
def send_message():
    data = request.get_json()
    user_message = (data.get('message') or '').strip()

    if not user_message:
        return jsonify({'error': 'پیام الزامی است'}), 400

    settings = SiteSetting.query.filter(SiteSetting.key.like('chatbot_%')).all()
    s = {sk.key.replace('chatbot_', ''): sk.value for sk in settings}
    enabled = s.get('enabled', 'false') == 'true'

    if not enabled:
        return jsonify({'error': 'چت‌بات در حال حاضر غیرفعال است'}), 403

    user_msg = ChatbotMessage(sender='user', message=user_message)
    db.session.add(user_msg)
    db.session.commit()

    api_key = s.get('api_key', '').strip()
    prompt = s.get('prompt', '').strip()

    ai_response = None

    if api_key:
        try:
            client = OpenAI(api_key=api_key, base_url='https://api.openai.com/v1')
            system_prompt = prompt or 'شما دستیار هوشمند مطب پزشکی هستید و به سوالات بیماران به زبان فارسی پاسخ می‌دهید.'
            messages_history = [{'role': 'system', 'content': system_prompt}]
            recent = ChatbotMessage.query.order_by(ChatbotMessage.created_at.desc()).limit(10).all()
            for m in reversed(recent):
                role = 'assistant' if m.sender == 'bot' else 'user'
                messages_history.append({'role': role, 'content': m.message})
            resp = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=messages_history,
                max_tokens=500,
                temperature=0.7,
            )
            ai_response = resp.choices[0].message.content.strip()
        except Exception as e:
            print(f'OpenAI error: {e}')
            traceback.print_exc()

    if not ai_response:
        ai_response = get_response(user_message)

    bot_msg = ChatbotMessage(sender='bot', message=ai_response)
    db.session.add(bot_msg)
    db.session.commit()

    return jsonify({
        'user_message': {
            'id': user_msg.id,
            'sender': 'user',
            'message': user_message,
            'created_at': user_msg.created_at.strftime('%H:%M') if user_msg.created_at else ''
        },
        'bot_message': {
            'id': bot_msg.id,
            'sender': 'bot',
            'message': ai_response,
            'created_at': bot_msg.created_at.strftime('%H:%M') if bot_msg.created_at else ''
        },
        'prompt_used': s.get('prompt', '')
    })
