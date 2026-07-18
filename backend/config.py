import os
import sys
from datetime import timedelta

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_uploads_dir():
    return os.path.join(get_base_dir(), 'uploads')

BASE_DIR = get_base_dir()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nobatyar-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "instance", "nobatyar.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    OTP_EXPIRE_SECONDS = 120
    SMS_IR_USERNAME = '9036559982'
    SMS_IR_PASSWORD = 'yA09lvhcb8KbCVNqdeQ2PCeGEs5ZG4TSJrf8PAVySGLVR0Qb'
    SMS_IR_LINE = '30002108021746'
