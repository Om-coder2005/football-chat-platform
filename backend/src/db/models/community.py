from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from src.db.models.user import Base

class Community(Base):
    __tablename__ = 'communities'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    club_name = Column(String(100), nullable=True)
    is_public = Column(Boolean, default=True)
    member_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = relationship('CommunityMember', back_populates='community', cascade='all, delete-orphan')
    messages = relationship('Message', back_populates='community', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'club_name': self.club_name,
            'is_public': self.is_public,
            'member_count': self.member_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
