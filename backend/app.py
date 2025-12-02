from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, join_room, leave_room, emit

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="http://localhost:5173", async_mode="threading")


def create_app():
    app = Flask(__name__)

    # Core config
    app.config["SECRET_KEY"] = "football-chat-secret!"  # move to .env later
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "postgresql+psycopg2://chat_user:ChatRoom123!@localhost:5432/football_chat"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Init extensions
    db.init_app(app)
    socketio.init_app(app)

    # ----- MODELS -----
    class TestUser(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(50), unique=True, nullable=False)

    # ----- ROUTES -----
    @app.route("/")
    def index():
        return render_template("index.html")

    # ----- SOCKET EVENTS -----
    @socketio.on("join_room")
    def handle_join(data):
        room = data["room"]
        username = data["username"]
        join_room(room)
        emit("status", f"{username} joined {room}", to=room, broadcast=True)

    @socketio.on("leave_room")
    def handle_leave(data):
        room = data["room"]
        username = data["username"]
        leave_room(room)
        emit("status", f"{username} left {room}", to=room, broadcast=True)

    @socketio.on("send_message")
    def handle_message(data):
        room = data["room"]
        msg = data["message"]
        emit(
            "receive_message",
            {"username": data["username"], "message": msg},
            to=room,
            broadcast=True,
        )

    return app


# Create app for running
app = create_app()


if __name__ == "__main__":
    # Ensure tables exist once at startup
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
