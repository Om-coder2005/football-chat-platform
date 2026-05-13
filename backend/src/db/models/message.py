from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.models.user import Base

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    community_id = Column(Integer, ForeignKey('communities.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    is_highlighted = Column(DateTime, nullable=True) # Store timestamp of highlight, or null if not highlighted
    media_url = Column(Text, nullable=True)
    media_description = Column(Text, nullable=True)
    
    # Relationships
    user = relationship('User', back_populates='messages')
    community = relationship('Community', back_populates='messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'avatar_url': self.user.avatar_url if self.user else None,
            'community_id': self.community_id,
            'is_highlighted': self.is_highlighted.isoformat() if self.is_highlighted else None,
            'media_url': self.media_url,
            'media_description': self.media_description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
