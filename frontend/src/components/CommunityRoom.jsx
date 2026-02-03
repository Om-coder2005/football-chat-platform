import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { messageAPI, communityAPI } from '../services/api';
import '../styles/CommunityRoom.css';

const CommunityRoom = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [community, setCommunity] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('access_token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Handle Authentication and Data Fetching
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCommunityAndMessages();
  }, [communityId]);

  // Handle Socket Lifecycle
  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'], // More robust for real-time
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', { room: communityId, token });
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on('error', (data) => {
      alert(data.message);
      if (data.message.includes('join')) navigate('/communities');
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_room', { room: communityId, token });
      newSocket.disconnect();
    };
  }, [communityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCommunityAndMessages = async () => {
    try {
      const commResponse = await communityAPI.getAll();
      const comm = commResponse.data.communities.find((c) => c.id === parseInt(communityId));
      setCommunity(comm);

      const msgResponse = await messageAPI.getHistory(communityId, 50, 0);
      if (msgResponse.data.success) {
        setMessages(msgResponse.data.messages);
      }
    } catch (error) {
      if (error.response?.status === 403) navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    socket.emit('send_message', {
      room: communityId,
      message: inputMessage.trim(),
      token,
    });
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading-screen">INITIALIZING MATCH...</div>;

  return (
    <div className="chat-view-wrapper">
      <div className="chat-container">
        <header className="chat-header">
          <button className="back-btn" onClick={() => navigate('/communities')}>
            EXIT PITCH
          </button>
          <div className="community-info">
            <h2>{community?.name}</h2>
            <div className={`match-status ${isConnected ? 'live' : 'offline'}`}>
              <span className="dot"></span> {isConnected ? 'LIVE' : 'RECONNECTING...'}
            </div>
          </div>
          <div className="member-badge">
            SQUAD: {community?.member_count || 0}
          </div>
        </header>

        <div className="messages-viewport">
          {messages.length === 0 ? (
            <div className="empty-chat-placeholder">
              <p>Pitch is empty. Start the play! ⚽</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`msg-row ${msg.user_id === currentUser.id ? 'msg-own' : 'msg-other'}`}
              >
                <div className="msg-bubble">
                  <div className="msg-meta">
                    <span className="msg-user">{msg.username}</span>
                    <span className="msg-time">{formatTime(msg.created_at)}</span>
                  </div>
                  <div className="msg-text">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="input-wrapper">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Send a message..." : "Waiting for connection..."}
              disabled={!isConnected}
            />
            <button 
              className="send-trigger" 
              onClick={sendMessage} 
              disabled={!isConnected || !inputMessage.trim()}
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityRoom;