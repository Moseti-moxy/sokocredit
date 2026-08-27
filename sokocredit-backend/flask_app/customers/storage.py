import os

from flask import current_app
from werkzeug.utils import secure_filename

from .models import new_id

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB per file


def _extension(filename):
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def is_allowed_file(filename):
    return bool(filename) and _extension(filename) in ALLOWED_EXTENSIONS


def save_customer_file(customer_id, file_storage):
    """Persist an uploaded werkzeug FileStorage to disk under UPLOAD_FOLDER/customer_id/.

    Returns (storage_path, size_bytes). Raises ValueError on invalid file.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError('No file provided.')
    if not is_allowed_file(file_storage.filename):
        raise ValueError('File type not allowed. Use PDF, JPG, or PNG.')

    upload_root = current_app.config['UPLOAD_FOLDER']
    customer_dir = os.path.join(upload_root, customer_id)
    os.makedirs(customer_dir, exist_ok=True)

    safe_name = secure_filename(file_storage.filename)
    stored_name = f'{new_id()}_{safe_name}'
    disk_path = os.path.join(customer_dir, stored_name)

    file_storage.save(disk_path)
    size_bytes = os.path.getsize(disk_path)
    if size_bytes > MAX_FILE_SIZE_BYTES:
        os.remove(disk_path)
        raise ValueError('File exceeds the 5MB limit.')

    # Store a path relative to UPLOAD_FOLDER so it's portable across environments.
    relative_path = os.path.join(customer_id, stored_name)
    return relative_path, size_bytes


def absolute_path(storage_path):
    return os.path.join(current_app.config['UPLOAD_FOLDER'], storage_path)


def delete_customer_file(storage_path):
    path = absolute_path(storage_path)
    if os.path.exists(path):
        os.remove(path)
