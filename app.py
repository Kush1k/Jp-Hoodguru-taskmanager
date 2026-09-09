import os
import sqlite3
from functools import wraps
from flask import Flask, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

app=Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = os.environ.get('TASK_MANAGER_SECRET', 'local-development-secret-change-me')
base_dir=os.path.dirname(os.path.abspath(__file__))
data_dir=os.environ.get('TASK_MANAGER_DATA_DIR', base_dir)
os.makedirs(data_dir, exist_ok=True)
db_path=os.path.join(data_dir,'database.db')
VALID_STATUSES = {'Pending', 'In Progress', 'Completed'}

def get_db_connection():
    con=sqlite3.connect(db_path)
    con.row_factory=sqlite3.Row
    return con
def init_db():
    con=get_db_connection()
    con.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    con.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    columns = {row['name'] for row in con.execute('PRAGMA table_info(tasks)').fetchall()}
    if 'user_id' not in columns:
        con.execute('ALTER TABLE tasks ADD COLUMN user_id INTEGER')
    if 'created_at' not in columns:
        con.execute('ALTER TABLE tasks ADD COLUMN created_at TEXT')
    con.commit()
    con.close()
init_db()

def authenticated(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return {'error': 'Authentication required'}, 401
        return handler(*args, **kwargs)
    return wrapper

@app.route('/')
def task_manager():
    return send_from_directory(base_dir, 'task_manager.html')

@app.route('/script.js')
def frontend_script():
    return send_from_directory(base_dir, 'script.js')

@app.route('/styles11/<path:filename>')
def frontend_styles(filename):
    return send_from_directory(os.path.join(base_dir, 'styles11'), filename)

@app.route('/icons/<path:filename>')
def frontend_icons(filename):
    return send_from_directory(os.path.join(base_dir, 'icons'), filename)

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data=request.get_json(silent=True) or {}
    username=data.get('username', '').strip().lower()
    password=data.get('password', '')
    if len(username) < 3 or len(password) < 6:
        return {'error': 'Username must be 3+ characters and password 6+ characters'}, 400
    con=get_db_connection()
    try:
        cur=con.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)',
                        (username, generate_password_hash(password)))
        con.commit()
    except sqlite3.IntegrityError:
        con.close()
        return {'error': 'That username is already in use'}, 409
    session['user_id'] = cur.lastrowid
    session['username'] = username
    con.close()
    return {'username': username}, 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data=request.get_json(silent=True) or {}
    username=data.get('username', '').strip().lower()
    con=get_db_connection()
    user=con.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    con.close()
    if not user or not check_password_hash(user['password_hash'], data.get('password', '')):
        return {'error': 'Invalid username or password'}, 401
    session['user_id'] = user['id']
    session['username'] = user['username']
    return {'username': user['username']}

@app.route('/api/auth/me')
def current_user():
    if 'user_id' not in session:
        return {'authenticated': False}
    return {'authenticated': True, 'username': session['username']}

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return {'message': 'Logged out'}

@app.route('/api/tasks',methods=['GET'])
@authenticated
def get_tasks():
    con=get_db_connection()
    tasks=con.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC', (session['user_id'],)).fetchall()
    con.close()
    return([dict(task) for task in tasks])


@app.route('/api/tasks',methods=['POST'])
@authenticated
def create_task():
    data=request.get_json(silent=True) or {}
    name=data.get('name')
    title=data.get('title')
    description=data.get('description','')
    status=data.get('status','Pending')
    if not name or not title:
        return({"error":'Name and Title are required'}), 400
    if status not in VALID_STATUSES:
        return({'error': 'Invalid task status'}), 400

    con=get_db_connection()
    cur=con.cursor()
    cur.execute('INSERT INTO tasks (user_id,name,title,description,status) VALUES (?,?,?,?,?)',
                (session['user_id'], name, title, description, status))
    con.commit()
    new_id=cur.lastrowid
    con.close()
    return({
        'id': new_id, 
        'name': name, 
        'title': title, 
        'description': description, 
        'status': status
    }), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@authenticated
def update_task(task_id):
    data=request.get_json(silent=True) or {}
    allowed_fields = {'name', 'title', 'description', 'status'}
    updates = {field: data[field] for field in allowed_fields if field in data}
    if not updates:
        return({'error': 'Provide at least one task field to update'}), 400
    if not updates.get('name', 'valid') or not updates.get('title', 'valid'):
        return({'error': 'Name and Title cannot be empty'}), 400
    if 'status' in updates and updates['status'] not in VALID_STATUSES:
        return({'error': 'Invalid task status'}), 400

    con=get_db_connection()
    assignments = ', '.join(f'{field} = ?' for field in updates)
    result = con.execute(
        f'UPDATE tasks SET {assignments} WHERE id = ? AND user_id = ?',
        (*updates.values(), task_id, session['user_id'])
    )
    con.commit()
    if result.rowcount == 0:
        con.close()
        return({'error': 'Task not found'}), 404
    task = con.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    con.close()
    return(dict(task))


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@authenticated
def delete_task(task_id):
    con=get_db_connection()
    result = con.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, session['user_id']))
    con.commit()
    con.close()
    if result.rowcount == 0:
        return ({'error': 'Task not found'}), 404
    return ({'message': 'Task deleted successfully'})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
