from contextlib import contextmanager
import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import scoped_session, sessionmaker

from src.db.models.club_news import ClubNews
from src.db.models.community import Community
from src.db.models.community_member import CommunityMember
from src.db.models.message import Message
from src.db.models.new_models import (
    CommunityBan,
    PredictionPoll,
    RivalryMessage,
    RivalryRoom,
    RumorRating,
    Sticker,
    TacticBoard,
    TransferRumor,
    UserPrediction,
    UserSticker,
)
from src.db.models.user import Base, User


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///football_chat.db")


def _resolve_database_url(database_url: str) -> str:
    """Resolve relative SQLite paths against the backend directory."""
    if database_url.startswith("sqlite:///") and not database_url.startswith("sqlite:////"):
        relative_path = database_url.replace("sqlite:///", "", 1)
        backend_root = Path(__file__).resolve().parents[2]
        absolute_path = (backend_root / relative_path).resolve()
        return f"sqlite:///{absolute_path.as_posix()}"
    return database_url


DATABASE_URL = _resolve_database_url(DATABASE_URL)

engine_kwargs = {"echo": False, "pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))


SQLITE_SCHEMA_PATCHES = {
    "users": {
        "bio": "ALTER TABLE users ADD COLUMN bio VARCHAR(255)",
        "favorite_club": "ALTER TABLE users ADD COLUMN favorite_club VARCHAR(100)",
        "display_name": "ALTER TABLE users ADD COLUMN display_name VARCHAR(100)",
        "header_url": "ALTER TABLE users ADD COLUMN header_url TEXT",
    },
    "community_members": {
        "muted_until": "ALTER TABLE community_members ADD COLUMN muted_until DATETIME",
        "warnings_count": "ALTER TABLE community_members ADD COLUMN warnings_count INTEGER DEFAULT 0",
    },
    "messages": {
        "is_highlighted": "ALTER TABLE messages ADD COLUMN is_highlighted DATETIME",
        "media_url": "ALTER TABLE messages ADD COLUMN media_url TEXT",
        "media_description": "ALTER TABLE messages ADD COLUMN media_description TEXT",
        "is_pinned": "ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT 0",
    },
    "transfer_rumors": {
        "article_url": "ALTER TABLE transfer_rumors ADD COLUMN article_url TEXT",
        "import_source": "ALTER TABLE transfer_rumors ADD COLUMN import_source VARCHAR(50)",
        "transfer_status": "ALTER TABLE transfer_rumors ADD COLUMN transfer_status VARCHAR(40)",
        "ai_confidence": "ALTER TABLE transfer_rumors ADD COLUMN ai_confidence FLOAT",
        "release_clause": "ALTER TABLE transfer_rumors ADD COLUMN release_clause VARCHAR(50)",
        "transfer_value": "ALTER TABLE transfer_rumors ADD COLUMN transfer_value VARCHAR(50)",
        "asking_price": "ALTER TABLE transfer_rumors ADD COLUMN asking_price VARCHAR(50)",
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


def _remove_legacy_inserted_rows():
    """Delete rows inserted by older development startup code."""
    db = SessionLocal()
    removed = 0
    try:
        legacy_rivalry_rooms = [
            ("Real Madrid", "FC Barcelona", "live", 42, 38),
            ("Manchester City", "Manchester United", "scheduled", 0, 0),
            ("Arsenal", "Chelsea", "finished", 85, 70),
        ]
        for home, away, status, home_score, away_score in legacy_rivalry_rooms:
            rows = db.query(RivalryRoom).filter(
                RivalryRoom.home_club_name == home,
                RivalryRoom.away_club_name == away,
                RivalryRoom.status == status,
                RivalryRoom.home_respect_score == home_score,
                RivalryRoom.away_respect_score == away_score,
                RivalryRoom.match_id.is_(None),
                ~RivalryRoom.messages.any(),
                ~RivalryRoom.polls.any(),
            ).all()
            for row in rows:
                db.delete(row)
                removed += 1

        legacy_sticker_names = [
            "Angry Pep",
            "Klopp Fist Pump",
            "Mourinho Shhh",
            "Brazil Flag",
            "Argentina Flag",
            "UK Flag",
            "Shocked Fan",
            "Ref Red Card",
            "Facepalm Coach",
            "Siuuu!",
            "Knee Slide",
            "Finger Point Sky",
        ]
        stickers = db.query(Sticker).filter(Sticker.name.in_(legacy_sticker_names)).all()
        for sticker in stickers:
            db.query(UserSticker).filter(
                UserSticker.sticker_id == sticker.id
            ).delete(synchronize_session=False)
            db.delete(sticker)
            removed += 1

        legacy_transfer_rows = [
            ("Erling Haaland", "Manchester City", "Real Madrid"),
            ("Kylian Mbappe", "Real Madrid", "FC Barcelona"),
            ("Kylian Mbappé", "Real Madrid", "FC Barcelona"),
            ("Kylian MbappÃ©", "Real Madrid", "FC Barcelona"),
            ("Mohamed Salah", "Liverpool", "Al Ittihad"),
        ]
        for player, from_club, to_club in legacy_transfer_rows:
            rumors = db.query(TransferRumor).filter(
                TransferRumor.player_name == player,
                TransferRumor.from_club == from_club,
                TransferRumor.to_club == to_club,
            ).all()
            for rumor in rumors:
                db.query(RumorRating).filter(
                    RumorRating.rumor_id == rumor.id
                ).delete(synchronize_session=False)
                db.delete(rumor)
                removed += 1

        vague_imports = db.query(TransferRumor).filter(
            TransferRumor.import_source == "newsapi",
            TransferRumor.from_club == "Transfer News",
        ).all()
        for rumor in vague_imports:
            db.query(RumorRating).filter(
                RumorRating.rumor_id == rumor.id
            ).delete(synchronize_session=False)
            db.delete(rumor)
            removed += 1

        system_user = db.query(User).filter(
            User.username == "system",
            User.email == "system@footballchat.com",
        ).first()
        if system_user:
            remaining_rumors = db.query(TransferRumor).filter(
                TransferRumor.created_by == system_user.id
            ).count()
            if remaining_rumors == 0:
                db.delete(system_user)
                removed += 1

        if removed:
            db.commit()
            print(f"Removed {removed} legacy inserted rows.")
    except Exception as e:
        db.rollback()
        print(f"Error removing legacy inserted rows: {str(e)}")
    finally:
        db.close()


def init_db():
    """Initialize database schema without inserting development data."""
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_schema_patches()
    _remove_legacy_inserted_rows()
    print("Database initialized successfully!")


def get_db():
    """Dependency to get database session."""
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
