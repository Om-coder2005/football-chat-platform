# migrate_to_postgres.py
import sys
import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from src.db.models.user import Base, User
from src.db.models.community import Community
from src.db.models.community_member import CommunityMember
from src.db.models.message import Message
from src.db.models.club_news import ClubNews

# Load config
SQLITE_URL = "sqlite:///football_chat.db"
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or not POSTGRES_URL.startswith("postgresql"):
    print("Error: DATABASE_URL environment variable must be a valid PostgreSQL connection string.")
    sys.exit(1)

print("Starting DB migration pipeline...")
sqlite_engine = create_engine(SQLITE_URL)
postgres_engine = create_engine(POSTGRES_URL)

# 1. Create tables in PostgreSQL
Base.metadata.create_all(bind=postgres_engine)
print("Postgres tables configured successfully.")

SqliteSession = sessionmaker(bind=sqlite_engine)
PostgresSession = sessionmaker(bind=postgres_engine)

sqlite_session = SqliteSession()
postgres_session = PostgresSession()

try:
    # 2. Extract and Load tables sequentially to preserve foreign key constraints
    
    # --- Users ---
    users = sqlite_session.query(User).all()
    print(f"Migrating {len(users)} users...")
    for u in users:
        user_copy = User(
            id=u.id, username=u.username, email=u.email, password_hash=u.password_hash,
            avatar_url=u.avatar_url, bio=u.bio, favorite_club=u.favorite_club,
            display_name=u.display_name, header_url=u.header_url,
            is_active=u.is_active, is_banned=u.is_banned, created_at=u.created_at
        )
        postgres_session.merge(user_copy)
    postgres_session.commit()

    # --- Communities ---
    communities = sqlite_session.query(Community).all()
    print(f"Migrating {len(communities)} communities...")
    for c in communities:
        comm_copy = Community(
            id=c.id, name=c.name, description=c.description, club_name=c.club_name,
            is_public=c.is_public, member_count=c.member_count, created_at=c.created_at
        )
        postgres_session.merge(comm_copy)
    postgres_session.commit()

    # --- Community Members ---
    members = sqlite_session.query(CommunityMember).all()
    print(f"Migrating {len(members)} memberships...")
    for m in members:
        mem_copy = CommunityMember(
            id=m.id, user_id=m.user_id, community_id=m.community_id,
            role=m.role, joined_at=m.joined_at, muted_until=m.muted_until,
            warnings_count=m.warnings_count
        )
        postgres_session.merge(mem_copy)
    postgres_session.commit()

    # --- Messages ---
    messages = sqlite_session.query(Message).all()
    print(f"Migrating {len(messages)} messages...")
    for msg in messages:
        msg_copy = Message(
            id=msg.id, content=msg.content, user_id=msg.user_id, community_id=msg.community_id,
            created_at=msg.created_at, is_highlighted=msg.is_highlighted, is_pinned=msg.is_pinned,
            media_url=msg.media_url, media_description=msg.media_description
        )
        postgres_session.merge(msg_copy)
    postgres_session.commit()

    # --- News Cache ---
    news = sqlite_session.query(ClubNews).all()
    print(f"Migrating {len(news)} news cards...")
    for n in news:
        news_copy = ClubNews(
            news_id=n.news_id, club_name=n.club_name, title=n.title,
            description=n.description, image_url=n.image_url, article_url=n.article_url,
            source_name=n.source_name, published_at=n.published_at, created_at=n.created_at
        )
        postgres_session.merge(news_copy)
    postgres_session.commit()

    # 3. CRITICAL: Reset autoincrement sequence primary keys in PostgreSQL
    print("Resetting sequences in PostgreSQL...")
    conn = postgres_engine.raw_connection()
    cursor = conn.cursor()
    seq_tables = ["users", "communities", "community_members", "messages"]
    for table in seq_tables:
        cursor.execute(f"SELECT setval('{table}_id_seq', COALESCE((SELECT MAX(id)+1 FROM {table}), 1), false);")
    conn.commit()
    cursor.close()
    conn.close()

    print("🎉 Database migration completed with absolute relational integrity!")

except Exception as e:
    postgres_session.rollback()
    print(f"❌ DB Migration failed due to an error: {e}")
finally:
    sqlite_session.close()
    postgres_session.close()
