from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.db.models.message import Message
from src.db.models.community_member import CommunityMember
from src.db.models.user import User

class MessageService:
    @staticmethod
    def create_message(db: Session, content, user_id, community_id):
        """Create a new message and save to database"""
        try:
            message = Message(
                content=content,
                user_id=user_id,
                community_id=community_id
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            return True, "Message created successfully", message
        except Exception as e:
            db.rollback()
            return False, f"Error creating message: {str(e)}", None
    
    @staticmethod
    def get_community_messages(db: Session, community_id, limit=50, offset=0):
        """
        Get messages for a community with pagination
        Returns oldest messages first (chronological order)
        """
        try:
            messages = db.query(Message).filter(
                Message.community_id == community_id
            ).order_by(Message.created_at.asc()).limit(limit).offset(offset).all()
            
            return messages
        except Exception as e:
            print(f"Error fetching messages: {str(e)}")
            return []
    
    @staticmethod
    def delete_message(db: Session, message_id, user_id):
        """Delete a message (only by the author or community admin)"""
        try:
            message = db.query(Message).filter(
                Message.id == message_id
            ).first()
            
            if not message:
                return False, "Message not found"
            
            # Check if user is the author
            if message.user_id != user_id:
                # TODO: Also allow community admins to delete
                return False, "Unauthorized: You can only delete your own messages"
            
            db.delete(message)
            db.commit()
            return True, "Message deleted successfully"
        except Exception as e:
            db.rollback()
            return False, f"Error deleting message: {str(e)}"
    
    @staticmethod
    def get_message_count(db: Session, community_id):
        """Get total message count for a community"""
        try:
            count = db.query(Message).filter(
                Message.community_id == community_id
            ).count()
            return count
        except Exception as e:
            return 0
