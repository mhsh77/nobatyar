import threading
import urllib.request
import json
from config import Config

def send_verify_sms(mobile, template_id, params):
    data = json.dumps({
        'mobile': mobile,
        'templateId': template_id,
        'parameters': [{'name': k, 'value': str(v)} for k, v in params.items()]
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.sms.ir/v1/send/verify',
        data=data,
        headers={
            'Content-Type': 'application/json',
            'x-api-key': Config.SMS_IR_API_KEY
        }
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        print(f'SMS sent: {resp.read().decode()}')
    except Exception as e:
        print(f'SMS error: {e}')

def send_sms_async(mobile, template_id, params):
    t = threading.Thread(target=send_verify_sms, args=(mobile, template_id, params))
    t.daemon = True
    t.start()

def send_url_sms(mobile, text):
    """Send SMS via URL-based API (simple text message)"""
    try:
        import urllib.parse
        params = urllib.parse.urlencode({
            'username': Config.SMS_IR_USERNAME,
            'password': Config.SMS_IR_API_KEY,
            'line': Config.SMS_IR_LINE,
            'mobile': mobile,
            'text': text
        })
        req = urllib.request.Request(f'https://api.sms.ir/v1/send?{params}')
        resp = urllib.request.urlopen(req, timeout=10)
        print(f'SMS sent via URL: {resp.read().decode()}')
    except Exception as e:
        print(f'SMS URL error: {e}')



def send_doctor_sms(mobile, name, date, time):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_DOCTOR, {'Name': name, 'Date': date, 'Time': time})

def send_seminar_sms(mobile, name, title, date):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_SEMINAR, {'Name': name, 'Title': title, 'Date': date})

def send_reminder_sms(mobile, name, time):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_REMINDER, {'Name': name, 'Time': time})

def send_cancel_sms(mobile, name, date):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_CANCEL, {'Name': name, 'Date': date})

def send_reschedule_sms(mobile, name, date, time):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_RESCHEDULE, {'Name': name, 'Date': date, 'Time': time})

def send_approve_sms(mobile, name, date, time, code):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_APPROVE, {'Name': name, 'Date': date, 'Time': time, 'Code': code})

def send_otp_sms(mobile, code):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_OTP, {'Code': code})

def send_booking_sms(mobile, name, date, time, code):
    send_sms_async(mobile, Config.SMS_IR_TEMPLATE_BOOKING, {
        'Name': name,
        'Date': date,
        'Time': time,
        'Code': code
    })
