from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.models.user import Base

class CommunityMember(Base):
    __tablename__ = 'community_members'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    community_id = Column(Integer, ForeignKey('communities.id'), nullable=False)
    role = Column(String(20), default='member')
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='memberships')
    community = relationship('Community', back_populates='members')
    
    __table_args__ = (UniqueConstraint('user_id', 'community_id', name='unique_user_community'),)
