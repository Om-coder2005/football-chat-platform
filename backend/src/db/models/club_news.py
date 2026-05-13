from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
import uuid
from src.db.models.user import Base

def generate_uuid():
    return str(uuid.uuid4())

class ClubNews(Base):
    __tablename__ = 'club_news'
    
    news_id = Column(String(36), primary_key=True, default=generate_uuid)
    club_name = Column(String(100), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    image_url = Column(Text)
    article_url = Column(Text, nullable=False, unique=True)
    source_name = Column(String(100))
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'news_id': self.news_id,
            'club_name': self.club_name,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'article_url': self.article_url,
            'source_name': self.source_name,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
