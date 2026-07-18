import os, sys

from config import get_base_dir, get_uploads_dir

os.makedirs(get_uploads_dir(), exist_ok=True)
os.makedirs(os.path.join(get_base_dir(), 'instance'), exist_ok=True)

from app import create_app
from extensions import db
from models import User

app = create_app()
with app.app_context():
    if User.query.count() == 0:
        print('Seeding database...')
        import seed
        seed.seed()
        print('Database seeded.')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
