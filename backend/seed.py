from app import create_app
from extensions import db, bcrypt
from models import User, DoctorSchedule, ClosedDay, Appointment, SiteSetting
from datetime import datetime, timedelta

def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        # Python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        # Persian mapping: 0=شنبه(Sat/5), 1=یکشنبه(Sun/6), 2=دوشنبه(Mon/0),
        #                   3=سه‌شنبه(Tue/1), 4=چهارشنبه(Wed/2), 5=پنجشنبه(Thu/3), 6=جمعه(Fri/4)

        doctor = User.query.filter_by(mobile='09120000001').first()
        if not doctor:
            doctor = User(
                full_name='دکتر محمد رضایی',
                national_id='0010000001',
                mobile='09120000001',
                role='doctor',
                password_hash=bcrypt.generate_password_hash('doctor123').decode('utf-8')
            )
            db.session.add(doctor)
            db.session.flush()

        secretary = User.query.filter_by(mobile='09120000002').first()
        if not secretary:
            secretary = User(
                full_name='زهرا احمدی',
                national_id='0010000002',
                mobile='09120000002',
                role='secretary',
                password_hash=bcrypt.generate_password_hash('secretary123').decode('utf-8')
            )
            db.session.add(secretary)
            db.session.flush()

        DoctorSchedule.query.delete()
        schedules = [
            DoctorSchedule(weekday=5, start_time='09:00', end_time='17:00', visit_duration=20),
            DoctorSchedule(weekday=6, start_time='09:00', end_time='17:00', visit_duration=20),
            DoctorSchedule(weekday=0, start_time='09:00', end_time='17:00', visit_duration=20),
            DoctorSchedule(weekday=1, start_time='09:00', end_time='17:00', visit_duration=20),
            DoctorSchedule(weekday=2, start_time='09:00', end_time='17:00', visit_duration=20),
            DoctorSchedule(weekday=3, start_time='09:00', end_time='13:00', visit_duration=20),
        ]
        for s in schedules:
            db.session.add(s)

        # Add sample patients and appointments
        sample_patients = [
            {'name': 'احمد کرمی', 'national_id': '4441112221', 'mobile': '09121234567', 'diseases': 'فشار خون'},
            {'name': 'سارا محمدی', 'national_id': '4441112222', 'mobile': '09131234567', 'diseases': 'دیابت نوع ۲'},
            {'name': 'رضا حسینی', 'national_id': '4441112223', 'mobile': '09141234567', 'diseases': 'آسم'},
        ]

        patient_ids = []
        for p in sample_patients:
            existing = User.query.filter_by(mobile=p['mobile']).first()
            if not existing:
                user = User(
                    full_name=p['name'],
                    national_id=p['national_id'],
                    mobile=p['mobile'],
                    role='patient',
                    underlying_diseases=p['diseases']
                )
                db.session.add(user)
                db.session.flush()
                patient_ids.append(user.id)
            else:
                patient_ids.append(existing.id)

        # Add sample appointments for today and upcoming
        today = datetime.now().strftime('%Y-%m-%d')
        today_appointments = [
            {'patient_idx': 0, 'time': '09:00', 'status': 'confirmed'},
            {'patient_idx': 1, 'time': '09:40', 'status': 'pending'},
            {'patient_idx': 2, 'time': '11:00', 'status': 'confirmed'},
        ]
        for app in today_appointments:
            pid = patient_ids[app['patient_idx']]
            existing = Appointment.query.filter_by(
                patient_id=pid, appointment_date=today, appointment_time=app['time']
            ).first()
            if not existing:
                a = Appointment(
                    patient_id=pid,
                    appointment_date=today,
                    appointment_time=app['time'],
                    status=app['status']
                )
                db.session.add(a)

        # Add a completed appointment from yesterday
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        for idx in [0, 1]:
            pid = patient_ids[idx]
            existing = Appointment.query.filter_by(
                patient_id=pid, appointment_date=yesterday
            ).first()
            if not existing:
                a = Appointment(
                    patient_id=pid,
                    appointment_date=yesterday,
                    appointment_time='10:00' if idx == 0 else '10:20',
                    status='completed'
                )
                db.session.add(a)

        SiteSetting.query.delete()
        default_settings = {
                'doctor_name': 'دکتر امیرحسین عبدی',
                'doctor_specialty': 'متخصص بیماری‌های داخلی',
                'hero_badge': 'متخصص بیماری‌های داخلی',
                'hero_description': 'با بیش از ۱۲ سال تجربه در تشخیص و درمان بیماری‌های داخلی، در کنار شما هستیم تا مسیر سلامتی را هموارتر کنیم.',
                'about_title': 'درباره من',
                'about_text': 'دکتر امیرحسین عبدی، فارغ‌التحصیل دانشگاه علوم پزشکی تهران با مدرک تخصص بیماری‌های داخلی. بیش از یک دهه است که در کنار بیمارانم هستم و با تکیه بر دانش روز و تجربه بالینی، بهترین مسیر درمانی را برای هر بیمار طراحی می‌کنم.\n\nمطب من با بهره‌گیری از تجهیزات مدرن و کادری مجرب، فضایی آرام و حرفه‌ای برای ویزیت و درمان شما فراهم کرده است.',
                'stats_years': '12',
                'stats_years_label': 'سال تجربه',
                'stats_patients': '18500',
                'stats_patients_label': 'بیمار راضی',
                'stats_visits': '62000',
                'stats_visits_label': 'نوبت ویزیت',
                'service_1_title': 'ویزیت تخصصی داخلی',
                'service_1_desc': 'معاینه کامل و تشخیص دقیق بیماری‌های داخلی',
                'service_2_title': 'نسخه نویسی و درمان',
                'service_2_desc': 'تجویز دارو بر اساس آخرین پروتکل‌های علمی',
                'service_3_title': 'پیگیری دوره درمان',
                'service_3_desc': 'بررسی مستمر روند بهبودی و تنظیم درمان',
                'service_4_title': 'مشاوره تخصصی',
                'service_4_desc': 'پاسخگویی به سوالات و راهنمایی بیماران',
                'contact_address': 'تهران، خیابان ولیعصر، بالاتر از ونک، پلاک ۱۲۳۴, طبقه سوم',
                'contact_phone': '۰۲۱-۱۲۳۴۵۶۷۸',
                'contact_email': 'dr.abdi@example.com',
                'hero_doctor_image': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&h=600&fit=crop&q=80',
                'about_clinic_image': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=750&fit=crop&q=80',
                'contact_hours': 'شنبه تا پنجشنبه ۰۹:۰۰ - ۱۷:۰۰',
        }
        for key, value in default_settings.items():
            db.session.add(SiteSetting(key=key, value=value))

        db.session.commit()
        print('Database seeded successfully!')
        print(f'Doctor mobile: 09120000001, password: doctor123')
        print(f'Secretary mobile: 09120000002, password: secretary123')
        print(f'Sample patients created with appointments')
        print(f'Today ({today}): 3 appointments')

if __name__ == '__main__':
    seed()
