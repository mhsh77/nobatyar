import os
import sys
import mimetypes
from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from config import Config, BASE_DIR
from extensions import db, bcrypt, jwt
from routes.auth import auth_bp
from routes.otp import otp_bp
from routes.appointments import appointment_bp
from routes.schedule import schedule_bp
from routes.secretary import secretary_bp
from routes.medical import medical_bp
from routes.settings import settings_bp
from routes.posts import posts_bp
from routes.chatbot import chatbot_bp
from routes.comments import comments_bp
from routes.feedback import feedback_bp

mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/svg+xml', '.svg')

def create_app(argv=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(otp_bp, url_prefix='/api')
    app.register_blueprint(appointment_bp, url_prefix='/api')
    app.register_blueprint(schedule_bp, url_prefix='/api')
    app.register_blueprint(secretary_bp, url_prefix='/api')
    app.register_blueprint(medical_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api')
    app.register_blueprint(posts_bp, url_prefix='/api')
    app.register_blueprint(chatbot_bp, url_prefix='/api')
    app.register_blueprint(comments_bp)
    app.register_blueprint(feedback_bp)

    # Seminar registration (conditional feature)
    if app.config.get('ENABLE_SEMINAR'):
        from routes.seminar import seminar_bp, SeminarRegistration
        app.register_blueprint(seminar_bp)
        # Ensure the table is created
        with app.app_context():
            SeminarRegistration.__table__.create(db.engine, checkfirst=True)

    frontend_dir = None
    if getattr(sys, 'frozen', False):
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            frontend_dir = os.path.join(meipass, 'frontend', 'dist')
    if not frontend_dir or not os.path.exists(frontend_dir):
        frontend_dir = os.path.join(BASE_DIR, 'frontend', 'dist')

    if os.path.exists(frontend_dir):
        @app.route('/')
        def index():
            return send_from_directory(frontend_dir, 'index.html')

        @app.route('/assets/<path:filename>')
        def serve_assets(filename):
            return send_from_directory(os.path.join(frontend_dir, 'assets'), filename)

        @app.route('/<path:filename>')
        def serve_frontend(filename):
            file_path = os.path.join(frontend_dir, filename)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return send_from_directory(frontend_dir, filename)
            return send_from_directory(frontend_dir, 'index.html')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False)
