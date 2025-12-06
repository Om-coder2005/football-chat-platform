import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import io from "socket.io-client";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import CommunityRoom from "./pages/CommunityRoom";

// INIT SOCKET
const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
  timeout: 20000,
});

// CHATROOM PAGE
function ChatRoom() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("status", (status) => setMessages((prev) => [...prev, status]));
    socket.on("receive_message", (data) =>
      setMessages((prev) => [...prev, `${data.username}: ${data.message}`])
    );

    return () => {
      socket.off("connect");
      socket.off("status");
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { username, room, message: message.trim() });
      setMessage("");
    }
  };

  const joinRoom = () => {
    if (username && room) {
      socket.emit("join_room", { username, room });
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#10b981", marginBottom: "20px" }}>🏆 Football Chat Platform</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "10px", marginRight: "10px", width: "150px" }}
        />
        <input
          placeholder="Room"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          style={{ padding: "10px", marginRight: "10px", width: "150px" }}
        />
        <button
          onClick={joinRoom}
          style={{
            padding: "10px 20px",
            background: "#10b981",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Join Room
        </button>
      </div>

      <div
        style={{
          height: "400px",
          border: "1px solid #e5e7eb",
          padding: "15px",
          overflowY: "scroll",
          marginBottom: "15px",
          background: "#f9fafb",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            {msg}
          </div>
        ))}
        {!connected && <div>Connecting to backend...</div>}
      </div>

      <div>
        <input
          placeholder="Type message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          style={{ padding: "10px", width: "400px", marginRight: "10px" }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280" }}>
        Backend: localhost:5000 | Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}
      </div>
    </div>
  );
}

// MAIN APP ROUTER
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/communities"
            element={
              <ProtectedRoute>
                <CommunityRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatRoom />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/communities" replace />} />
          <Route path="*" element={<Navigate to="/communities" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
