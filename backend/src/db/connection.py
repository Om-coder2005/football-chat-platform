from contextlib import contextmanager
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, scoped_session
from src.db.models.user import Base
from src.db.models.community import Community
from src.db.models.community_member import CommunityMember
from src.db.models.message import Message
from src.db.models.club_news import ClubNews
import os
from pathlib import Path

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///football_chat.db')


def _resolve_database_url(database_url: str) -> str:
    """
    Resolve relative SQLite paths against the backend directory, not process CWD.
    """
    if database_url.startswith("sqlite:///") and not database_url.startswith("sqlite:////"):
        relative_path = database_url.replace("sqlite:///", "", 1)
        backend_root = Path(__file__).resolve().parents[2]
        absolute_path = (backend_root / relative_path).resolve()
        return f"sqlite:///{absolute_path.as_posix()}"
    return database_url


DATABASE_URL = _resolve_database_url(DATABASE_URL)

engine_kwargs = {"echo": False, "pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    # SQLite is used from request threads and background threads in this app.
    engine_kwargs["connect_args"] = {"check_same_thread": False}

# Create engine
engine = create_engine(DATABASE_URL, **engine_kwargs)

# Create session factory
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))


SQLITE_SCHEMA_PATCHES = {
    "users": {
        "bio": "ALTER TABLE users ADD COLUMN bio VARCHAR(255)",
        "favorite_club": "ALTER TABLE users ADD COLUMN favorite_club VARCHAR(100)"
    },
    "messages": {
        "is_highlighted": "ALTER TABLE messages ADD COLUMN is_highlighted DATETIME",
        "media_url": "ALTER TABLE messages ADD COLUMN media_url TEXT",
        "media_description": "ALTER TABLE messages ADD COLUMN media_description TEXT",
    },
}


def _apply_sqlite_schema_patches():
    """Backfill missing SQLite columns for older local databases."""
    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, table_patches in SQLITE_SCHEMA_PATCHES.items():
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, alter_sql in table_patches.items():
                if column_name not in existing_columns:
                    connection.execute(text(alter_sql))

def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_schema_patches()
    print("Database initialized successfully!")

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context-managed database session for routes, jobs, and socket handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
