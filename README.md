# Football Fan Community Chat Platform

A real-time football fan community platform where supporters can create or join club-specific chat rooms, follow live match scores, read club news, and get AI-powered tactical summaries — all in one place.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00?logo=sqlalchemy&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## Features

### Real-Time Community Chat
- Create and join **club-specific communities** (public or private with join codes)
- **Real-time messaging** powered by Socket.IO with JWT-authenticated WebSocket connections
- Typing indicators, message highlighting, and media sharing
- Role-based permissions: **Host**, **Admin**, and **Member** roles
- Member management — add, remove, promote/demote members, and transfer ownership

### Live Match Center
- **Live scores** for matches across all major leagues
- Detailed **match pages** with goals, bookings, lineups, formations, and possession stats
- Browse matches by **competition** with full standings tables
- Smart team search — look up any team's latest or upcoming match

### AI-Powered Enrichment (Gemini)
- Automatic **goal scorer & booking lookup** via Gemini AI with Google Search when native API data is unavailable
- **Tactical summary generator** combining match data with live fan chat sentiment analysis
- **Media description** for images shared in chat (accessibility-friendly alt-text generation)
- Multi-key rotation with per-key cooldown to handle rate limits gracefully

### Club News Aggregation
- Automated **RSS news aggregation** from Goal.com, BBC Sport, ESPN, Sky Sports, and Marca
- News automatically categorized by club using keyword matching
- Background job fetches news every **15 minutes** via APScheduler
- Supports 12+ major clubs with curated keyword lists

### Authentication & Security
- JWT-based authentication with access tokens (1h) and refresh tokens (30 days)
- Bcrypt password hashing
- Protected routes on both frontend and backend
- API keys stored server-side only — frontend never touches external APIs

### User Profiles & Settings
- Customizable profiles with **bio**, **favorite club**, and **avatar URL**
- Dark/light **theme toggle** with persistent preference
- Account settings management

---

## Architecture

```
football-chat-platform/
├── backend/                        # Flask + Socket.IO server
│   ├── app.py                      # Application entry point
│   ├── requirements.txt            # Python dependencies
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/        # Business logic handlers
│   │   │   │   ├── auth_controller.py
│   │   │   │   ├── community_controller.py
│   │   │   │   ├── match_controller.py
│   │   │   │   ├── message_controller.py
│   │   │   │   └── news_controller.py
│   │   │   ├── middlewares/
│   │   │   │   └── auth_middleware.py
│   │   │   └── routes/             # API route definitions
│   │   │       ├── auth_routes.py
│   │   │       ├── community_routes.py
│   │   │       ├── match_routes.py
│   │   │       ├── message_routes.py
│   │   │       └── news_routes.py
│   │   ├── db/
│   │   │   ├── connection.py       # SQLAlchemy engine & session setup
│   │   │   └── models/             # ORM models
│   │   │       ├── user.py
│   │   │       ├── community.py
│   │   │       ├── community_member.py
│   │   │       ├── message.py
│   │   │       └── club_news.py
│   │   └── services/               # Core service layer
│   │       ├── auth_service.py
│   │       ├── community_service.py
│   │       ├── message_service.py
│   │       ├── match_service.py        # football-data.org integration
│   │       ├── api_football_service.py # API-Football integration
│   │       ├── sportsdb_service.py     # TheSportsDB integration
│   │       ├── news_service.py         # RSS aggregation
│   │       └── ai_stats_service.py     # Gemini AI enrichment
│   └── templates/                  # Server-rendered test pages
│
├── frontend/                       # React + Vite SPA
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                 # Router & route definitions
│       ├── main.jsx
│       ├── index.css               # Global styles
│       ├── components/
│       │   ├── Landing.jsx         # Public landing page
│       │   ├── Login.jsx           # Auth — login
│       │   ├── Register.jsx        # Auth — register
│       │   ├── CommunityList.jsx   # Browse/create communities
│       │   ├── CommunityRoom.jsx   # Real-time chat room
│       │   ├── LiveScores.jsx      # Today's matches dashboard
│       │   ├── LeagueMatches.jsx   # Competition match list + standings
│       │   ├── MatchDetail.jsx     # Full match detail page
│       │   ├── ClubNews.jsx        # Club-specific news feed
│       │   ├── Profile.jsx         # User profile
│       │   ├── Settings.jsx        # User settings
│       │   ├── AppHeader.jsx       # Navigation header
│       │   └── ProtectedRoute.jsx  # Auth guard wrapper
│       ├── contexts/
│       │   ├── AuthContext.jsx     # Auth state management
│       │   └── ThemeContext.jsx    # Theme state management
│       ├── services/
│       │   └── api.js              # Axios API client + interceptors
│       └── styles/                 # Component-specific CSS
│           ├── CommunityRoom.css
│           ├── LiveScores.css
│           └── MatchDetail.css
│
└── interview_materials/            # Team docs
```

---

## External APIs

The platform uses a **multi-API architecture** to distribute workload, avoid rate limits, and maximize free-tier usage:

| API | Role | Free Limit | Used For |
|-----|------|-----------|----------|
| [football-data.org](https://www.football-data.org/) | Primary structured data | 10 req/min | Standings, fixtures, match schedules, competition tables |
| [API-Football](https://www.api-football.com/) | Live match events | 100 req/day | Lineups, live events (only activated during live matches) |
| [TheSportsDB](https://www.thesportsdb.com/) | Media assets | Generous free access | Club logos, player images, banners, badges |
| [Gemini AI](https://ai.google.dev/) | AI enrichment | Free tier | Goal scorers, tactical summaries, media descriptions |
| RSS Feeds | News aggregation | Unlimited | Goal.com, BBC Sport, ESPN, Sky Sports, Marca |

> **Smart caching** is implemented at every layer — standings (5–10 min), fixtures (30 min), live matches (30–60 sec), club assets (permanent), news (15 min).

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **PostgreSQL** (recommended) or SQLite (default, zero-config)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/football-chat-platform.git
cd football-chat-platform
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
# Server
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
FLASK_DEBUG=1
PORT=5000

# Database (SQLite default — no setup needed)
# DATABASE_URL=sqlite:///football_chat.db

# For PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://chat_user:YourPassword@localhost:5432/football_chat

# Football APIs
FOOTBALL_DATA_API_KEY=your-key-here
API_FOOTBALL_API_KEY=your-key-here
THESPORTSDB_API_KEY=your-key-here

# AI (optional — for enriched match data & tactical summaries)
GEMINI_API_KEY=your-gemini-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the backend:

```bash
python app.py
```

The server will start on `http://localhost:5000` with gevent async mode.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will start on `http://localhost:5173`.

---

## Database

### Models

| Model | Description |
|-------|-------------|
| `User` | Accounts with username, email, hashed password, bio, favorite club, avatar, ban status |
| `Community` | Fan groups with name, club association, host, join code, public/private toggle |
| `CommunityMember` | Junction table linking users to communities with role (host/admin/member) |
| `Message` | Chat messages with text, media URL, media description, highlight status |
| `ClubNews` | Cached RSS articles categorized by club |

The app auto-creates tables on startup and applies schema patches for SQLite backward compatibility.

For PostgreSQL setup, see [`Postgres setup.md`](./backend/Postgres%20setup.md).

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create a new account |
| `POST` | `/login` | Login and receive JWT tokens |
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me` | Update profile |
| `POST` | `/logout` | Logout |

### Communities (`/api`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/communities` | List all public communities |
| `GET` | `/communities/my` | List user's joined communities |
| `POST` | `/communities` | Create a community |
| `POST` | `/communities/:id/join` | Join a community |
| `POST` | `/communities/:id/leave` | Leave a community |
| `GET` | `/communities/:id/members` | Get community members |
| `PUT` | `/communities/:id/members/:userId/role` | Update member role |
| `DELETE` | `/communities/:id/members/:userId` | Remove a member |
| `POST` | `/communities/:id/transfer-ownership` | Transfer host ownership |
| `POST` | `/communities/:id/add-member` | Add a member by username/email |
| `GET` | `/communities/:id/tactical-summary` | AI tactical summary |

### Messages (`/api`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/communities/:id/messages` | Get message history (paginated) |
| `POST` | `/communities/:id/messages` | Send a message |
| `DELETE` | `/messages/:id` | Delete a message |
| `PUT` | `/messages/:id/highlight` | Toggle message highlight |

### Matches (`/api`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/matches/live` | Get live matches |
| `GET` | `/matches/today` | Today's matches grouped by competition |
| `GET` | `/matches` | Matches by date range |
| `GET` | `/matches/:id` | Match detail with AI enrichment |
| `GET` | `/matches/team` | Search matches by team name |
| `GET` | `/competitions` | List competitions |
| `GET` | `/competitions/available` | Available competitions |
| `GET` | `/competitions/:id/matches` | Competition matches |
| `GET` | `/competitions/:id/standings` | Competition standings |
| `GET` | `/matches/:id/tactical-summary` | AI tactical summary for a match |

### News (`/api`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/news/:clubName` | Get latest news for a club |

### WebSocket Events (Socket.IO)
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a community chat room (JWT authenticated) |
| `leave_room` | Client → Server | Leave a chat room |
| `send_message` | Client → Server | Send a message (supports text + media) |
| `typing` | Client → Server | Broadcast typing indicator |
| `receive_message` | Server → Client | New message broadcast |
| `receive_typing` | Server → Client | Typing indicator broadcast |
| `user_joined` | Server → Client | User joined notification |
| `user_left` | Server → Client | User left notification |
| `error` | Server → Client | Error message |

---

## Tech Stack

### Backend
- **Flask 3.1** — lightweight Python web framework
- **Flask-SocketIO** — real-time WebSocket support (gevent async)
- **SQLAlchemy** — ORM with support for SQLite and PostgreSQL
- **Flask-JWT-Extended** — JWT authentication
- **Flask-Bcrypt** — password hashing
- **APScheduler** — background job scheduling for RSS news fetching
- **feedparser + BeautifulSoup** — RSS feed parsing
- **Google GenAI SDK** — Gemini API for AI features
- **Requests + httpx** — HTTP clients for external API calls

### Frontend
- **React 19** — component-based UI library
- **Vite 7** — fast build tool with HMR
- **Tailwind CSS 4** — utility-first CSS framework
- **React Router DOM 7** — client-side routing
- **Socket.IO Client** — real-time WebSocket communication
- **Axios** — HTTP client with interceptors
- **Framer Motion** — animations
- **Lucide React** — icon library
- **date-fns** — date formatting utilities

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

> **Never commit API keys or `.env` files.** All secrets must stay in `backend/.env` which is gitignored.

---

## License

This project is licensed under the ISC License.
