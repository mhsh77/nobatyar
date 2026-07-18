from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import uuid
import json
from extensions import db
from models import Post, User
from config import get_uploads_dir

posts_bp = Blueprint('posts', __name__)

UPLOAD_FOLDER = get_uploads_dir()
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@posts_bp.route('/posts', methods=['GET'])
def get_posts():
    posts = Post.query.filter_by(published=True).order_by(Post.created_at.desc()).all()
    result = []
    for p in posts:
        author = User.query.get(p.author_id)
        result.append({
            'id': p.id,
            'title': p.title,
            'content': p.content,
            'image': p.image or '',
            'author_name': author.full_name if author else '',
            'created_at': p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else ''
        })
    return jsonify({'posts': result})

@posts_bp.route('/posts/admin', methods=['GET'])
@jwt_required()
def get_admin_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    result = []
    for p in posts:
        author = User.query.get(p.author_id)
        result.append({
            'id': p.id,
            'title': p.title,
            'content': p.content,
            'image': p.image or '',
            'author_name': author.full_name if author else '',
            'published': p.published,
            'created_at': p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else ''
        })
    return jsonify({'posts': result})

@posts_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    p = Post.query.get_or_404(post_id)
    author = User.query.get(p.author_id)
    return jsonify({
        'id': p.id,
        'title': p.title,
        'content': p.content,
        'image': p.image or '',
        'author_name': author.full_name if author else '',
        'created_at': p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else '',
        'updated_at': p.updated_at.strftime('%Y-%m-%d %H:%M') if p.updated_at else ''
    })

@posts_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    data = request.form if request.form else (request.get_json() or {})
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    published = data.get('published', 'true') in ('true', 'True', True)

    if not title or not content:
        return jsonify({'error': 'عنوان و متن پست الزامی است'}), 400

    image = ''
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            fname = f'post_{uuid.uuid4().hex}.{ext}'
            file.save(os.path.join(UPLOAD_FOLDER, fname))
            image = f'/api/uploads/{fname}'

    post = Post(
        title=title, content=content, image=image or None,
        author_id=user_id, published=published
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({'message': 'پست ایجاد شد', 'id': post.id}), 201

@posts_bp.route('/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def update_post(post_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    p = Post.query.get_or_404(post_id)
    data = request.form if request.form else (request.get_json() or {})

    if 'title' in data: p.title = (data['title'] or '').strip()
    if 'content' in data: p.content = (data['content'] or '').strip()
    if 'published' in data: p.published = data['published'] in ('true', 'True', True)
    p.updated_at = datetime.utcnow()

    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            fname = f'post_{uuid.uuid4().hex}.{ext}'
            file.save(os.path.join(UPLOAD_FOLDER, fname))
            p.image = f'/api/uploads/{fname}'

    db.session.commit()
    return jsonify({'message': 'پست به‌روزرسانی شد'})

@posts_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role not in ('doctor', 'secretary'):
        return jsonify({'error': 'دسترسی غیرمجاز'}), 403

    p = Post.query.get_or_404(post_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'message': 'پست حذف شد'})
