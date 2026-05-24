from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.models.user import Base

# --- FEATURE 1, 9: Host Controls & Moderation Updates ---
class CommunityBan(Base):
    __tablename__ = 'community_bans'
    id = Column(Integer, primary_key=True)
    community_id = Column(Integer, ForeignKey('communities.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    banned_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    reason = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional relationships to ease queries
    community = relationship('Community')
    user = relationship('User', foreign_keys=[user_id])
    banned_by_user = relationship('User', foreign_keys=[banned_by])

# --- FEATURE 3 & 6: Sticker Marketplace ---
class Sticker(Base):
    __tablename__ = 'stickers'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    image_url = Column(Text, nullable=False)
    price = Column(Float, default=0.0) # 0.0 means free / default
    category = Column(String(50), default='Classic') # e.g. 'Memes', 'Flags', 'Reactions'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'image_url': self.image_url,
            'price': self.price,
            'category': self.category
        }

class UserSticker(Base):
    __tablename__ = 'user_stickers'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    sticker_id = Column(Integer, ForeignKey('stickers.id', ondelete='CASCADE'), nullable=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User')
    sticker = relationship('Sticker')

    __table_args__ = (UniqueConstraint('user_id', 'sticker_id', name='unique_user_sticker'),)

# --- FEATURE 4: Live Tactic Board ---
class TacticBoard(Base):
    __tablename__ = 'tactic_boards'
    id = Column(Integer, primary_key=True)
    community_id = Column(Integer, ForeignKey('communities.id', ondelete='CASCADE'), nullable=False, unique=True)
    board_state = Column(Text) # JSON string representation of canvas paths and token locations
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    community = relationship('Community')

    def to_dict(self):
        return {
            'id': self.id,
            'community_id': self.community_id,
            'board_state': self.board_state,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# --- FEATURE 8: Rivalry Rooms ---
class RivalryRoom(Base):
    __tablename__ = 'rivalry_rooms'
    id = Column(Integer, primary_key=True)
    home_club_name = Column(String(100), nullable=False)
    away_club_name = Column(String(100), nullable=False)
    scheduled_kickoff = Column(DateTime, nullable=False)
    status = Column(String(20), default='scheduled') # scheduled | live | finished
    home_respect_score = Column(Integer, default=0)
    away_respect_score = Column(Integer, default=0)
    match_id = Column(Integer, nullable=True) # Linked external match id
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    messages = relationship('RivalryMessage', back_populates='rivalry_room', cascade='all, delete-orphan')
    polls = relationship('PredictionPoll', back_populates='rivalry_room', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'home_club_name': self.home_club_name,
            'away_club_name': self.away_club_name,
            'scheduled_kickoff': self.scheduled_kickoff.isoformat() if self.scheduled_kickoff else None,
            'status': self.status,
            'home_respect_score': self.home_respect_score,
            'away_respect_score': self.away_respect_score,
            'match_id': self.match_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RivalryMessage(Base):
    __tablename__ = 'rivalry_messages'
    id = Column(Integer, primary_key=True)
    rivalry_room_id = Column(Integer, ForeignKey('rivalry_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    team_affinity = Column(String(20), nullable=False) # 'home' | 'away' | 'neutral'
    content = Column(Text, nullable=False)
    respect_votes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rivalry_room = relationship('RivalryRoom', back_populates='messages')
    user = relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'rivalry_room_id': self.rivalry_room_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'avatar_url': self.user.avatar_url if self.user else None,
            'team_affinity': self.team_affinity,
            'content': self.content,
            'respect_votes': self.respect_votes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PredictionPoll(Base):
    __tablename__ = 'prediction_polls'
    id = Column(Integer, primary_key=True)
    rivalry_room_id = Column(Integer, ForeignKey('rivalry_rooms.id', ondelete='CASCADE'), nullable=False)
    question = Column(String(255), nullable=False)
    options_json = Column(Text, nullable=False) # JSON list e.g. ["Madrid Win", "Barca Win", "Draw"]
    expires_at = Column(DateTime, nullable=False)
    correct_option = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    rivalry_room = relationship('RivalryRoom', back_populates='polls')
    predictions = relationship('UserPrediction', back_populates='poll', cascade='all, delete-orphan')

    def to_dict(self):
        import json
        try:
            options = json.loads(self.options_json)
        except Exception:
            options = []
        return {
            'id': self.id,
            'rivalry_room_id': self.rivalry_room_id,
            'question': self.question,
            'options': options,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'correct_option': self.correct_option,
            'is_active': self.is_active
        }

class UserPrediction(Base):
    __tablename__ = 'user_predictions'
    id = Column(Integer, primary_key=True)
    poll_id = Column(Integer, ForeignKey('prediction_polls.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    selected_option = Column(String(100), nullable=False)
    points_rewarded = Column(Integer, default=0)
    predicted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    poll = relationship('PredictionPoll', back_populates='predictions')
    user = relationship('User')

    __table_args__ = (UniqueConstraint('poll_id', 'user_id', name='unique_user_poll_vote'),)

    def to_dict(self):
        return {
            'id': self.id,
            'poll_id': self.poll_id,
            'user_id': self.user_id,
            'selected_option': self.selected_option,
            'points_rewarded': self.points_rewarded,
            'predicted_at': self.predicted_at.isoformat() if self.predicted_at else None
        }

# --- FEATURE 12: Transfer Rating Cards ---
class TransferRumor(Base):
    __tablename__ = 'transfer_rumors'
    id = Column(Integer, primary_key=True)
    player_name = Column(String(100), nullable=False)
    from_club = Column(String(100), nullable=False)
    to_club = Column(String(100), nullable=False)
    estimated_fee = Column(String(50), nullable=True)
    release_clause = Column(String(50), nullable=True)
    transfer_value = Column(String(50), nullable=True)
    asking_price = Column(String(50), nullable=True)
    source = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    article_url = Column(Text, nullable=True)
    import_source = Column(String(50), nullable=True)
    transfer_status = Column(String(40), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship('User')
    ratings = relationship('RumorRating', back_populates='rumor', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'player_name': self.player_name,
            'from_club': self.from_club,
            'to_club': self.to_club,
            'estimated_fee': self.estimated_fee,
            'release_clause': self.release_clause,
            'transfer_value': self.transfer_value,
            'asking_price': self.asking_price,
            'source': self.source,
            'details': self.details,
            'article_url': self.article_url,
            'import_source': self.import_source,
            'transfer_status': self.transfer_status,
            'ai_confidence': self.ai_confidence,
            'created_by': self.created_by,
            'username': self.user.username if self.user else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RumorRating(Base):
    __tablename__ = 'rumor_ratings'
    id = Column(Integer, primary_key=True)
    rumor_id = Column(Integer, ForeignKey('transfer_rumors.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    rating = Column(String(30), nullable=False) # 'reliable' | 'fake_news' | 'masterclass' | 'overpriced'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rumor = relationship('TransferRumor', back_populates='ratings')
    user = relationship('User')

    __table_args__ = (UniqueConstraint('rumor_id', 'user_id', name='unique_user_rumor_rating'),)

    def to_dict(self):
        return {
            'id': self.id,
            'rumor_id': self.rumor_id,
            'user_id': self.user_id,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
