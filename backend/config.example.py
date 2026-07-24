import os
import sys
from datetime import timedelta

# Copy this file to config.py and fill in the real values.
# config.py is gitignored because it holds live secrets (SMS API key, etc.).
# Prefer providing secrets via environment variables in production.

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_uploads_dir():
    return os.path.join(get_base_dir(), 'uploads')

BASE_DIR = get_base_dir()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'change-me-in-production')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'moradipsy.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'change-me-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    OTP_EXPIRE_SECONDS = 120

    # sms.ir credentials — set these (env vars recommended)
    SMS_IR_API_KEY = os.environ.get('SMS_IR_API_KEY', 'YOUR_SMS_IR_API_KEY')
    SMS_IR_USERNAME = os.environ.get('SMS_IR_USERNAME', 'YOUR_SMS_IR_USERNAME')
    SMS_IR_LINE = os.environ.get('SMS_IR_LINE', 'YOUR_SMS_IR_LINE')

    # Seminar registration feature
    ENABLE_SEMINAR = True
    SEMINAR_TITLE = 'سمینار تخصصی روانشناسی'

    # sms.ir VERIFY template IDs (create these in your sms.ir panel)
    SMS_IR_TEMPLATE_OTP = 815351
    SMS_IR_TEMPLATE_BOOKING = 619902
    SMS_IR_TEMPLATE_DOCTOR = 580012
    SMS_IR_TEMPLATE_SEMINAR = 814118
    SMS_IR_TEMPLATE_REMINDER = 970621
    SMS_IR_TEMPLATE_CANCEL = 800451
    SMS_IR_TEMPLATE_RESCHEDULE = 726063
    SMS_IR_TEMPLATE_APPROVE = 786713
