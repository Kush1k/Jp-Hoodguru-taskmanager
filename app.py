import os
import sqlite3
from flask import Flask, request
from flask_cors import CORS
app=Flask(__name__)
CORS(app)
base_dir=os.path.dirname(os.path.abspath(__file__))
db_path=os.path.join(base_dir,'database.db')
def get_db_connection():
    con=sqlite3.connect(db_path)
    con.row_factory=sqlite3.Row
    return con
def init_db():
    con=get_db_connection()
    con.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Incomplete'
        )
    ''')
    con.commit()
    con.close()
init_db()

@app.route('/api/tasks',methods=['GET'])
def get_tasks():
    con=get_db_connection()
    tasks=con.execute('Select * from tasks').fetchall()
    con.close()
    return([dict(task) for task in tasks])


@app.route('/api/tasks',methods=['POST'])
def create_task():
    data=request.get_json()
    name=data.get('name')
    title=data.get('title')
    description=data.get('description','')
    status=data.get('status','Pending')
    if not name or not title:
        return({"error":'Name and Title are required'}), 400

    con=get_db_connection()
    cur=con.cursor()
    cur.execute('INSERT INTO tasks (name,title,description,status) VALUES (?,?,?,?)',(name,title,description,status))
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
def update_task(task_id):
    data=request.get_json()
    status=data.get('status','Completed')
    con=get_db_connection()
    con.execute('UPDATE tasks SET status = ? WHERE id = ?',(status,task_id))
    con.commit()
    con.close()
    return({"message":'Task status updated succesfully'})


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    con=get_db_connection()
    con.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    con.commit()
    con.close()
    return ({'message': 'Task deleted successfully'})

if __name__ == '__main__':
    app.run(port=5000, debug=True)