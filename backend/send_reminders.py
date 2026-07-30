import sys, os
sys.path.insert(0, '/home/kut/moradipsy-backend')
os.chdir('/home/kut/moradipsy-backend')
import sqlite3
from datetime import datetime, timedelta, timezone
from sms_utils import send_verify_sms
from config import Config

iran_tz = timezone(timedelta(hours=3, minutes=30))
now = datetime.now(iran_tz)
mins_ahead = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
max_minute = now + timedelta(minutes=mins_ahead)

conn = sqlite3.connect('/home/kut/moradipsy-backend/instance/moradipsy.db')
c = conn.cursor()
c.execute('SELECT a.id, a.appointment_date, a.appointment_time, u.full_name, u.mobile FROM appointments a JOIN users u ON a.patient_id = u.id WHERE a.status = ? AND (a.reminder_sent IS NULL OR a.reminder_sent = 0)', ('confirmed',))
for row in c.fetchall():
    aid, a_date, a_time, name, mobile = row
    try:
        apt_dt = datetime.strptime(a_date + ' ' + a_time, '%Y-%m-%d %H:%M')
        apt_dt = apt_dt.replace(tzinfo=iran_tz)
        if apt_dt <= max_minute:
            send_verify_sms(mobile, Config.SMS_IR_TEMPLATE_REMINDER, {'Name': name, 'Time': a_time})
            c.execute('UPDATE appointments SET reminder_sent = 1 WHERE id = ?', (aid,))
            conn.commit()
            print('Sent to ' + mobile)
    except Exception as e:
        print('Error: ' + str(e))
conn.close()
print('Done')
