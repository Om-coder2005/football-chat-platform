from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'football-chat-secret!'
socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173", async_mode='eventlet')

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join_room')
def handle_join(data):
    room = data['room']
    username = data['username']
    join_room(room)
    emit('status', f'{username} joined {room}', to=room, broadcast=True)

@socketio.on('leave_room')
def handle_leave(data):
    room = data['room']
    username = data['username']
    leave_room(room)
    emit('status', f'{username} left {room}', to=room, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    room = data['room']
    msg = data['message']
    emit('receive_message', {'username': data['username'], 'message': msg}, to=room, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
