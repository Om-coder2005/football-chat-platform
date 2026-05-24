from sqlalchemy.orm import Session, joinedload
from src.db.models.message import Message
from src.db.models.community_member import CommunityMember

class MessageService:
    @staticmethod
    def create_message(db: Session, content, user_id, community_id, is_highlighted=None, media_url=None, media_description=None):
        """Create a new message and save to database"""
        try:
            message = Message(
                content=content,
                user_id=user_id,
                community_id=community_id,
                is_highlighted=is_highlighted,
                media_url=media_url,
                media_description=media_description
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
            ).options(joinedload(Message.user)).order_by(Message.created_at.asc()).limit(limit).offset(offset).all()
            
            return messages
        except Exception as e:
            print(f"Error fetching messages: {str(e)}")
            return []
    
    @staticmethod
    def delete_message(db: Session, message_id, user_id):
        """Delete a message by author or community admin/moderator"""
        try:
            message = db.query(Message).filter(
                Message.id == message_id
            ).first()
            
            if not message:
                return False, "Message not found"
            
            # Allow author delete
            if message.user_id != user_id:
                # Also allow community admin/moderator delete
                membership = db.query(CommunityMember).filter_by(
                    user_id=user_id,
                    community_id=message.community_id
                ).first()

                if not membership or membership.role not in ('admin', 'moderator'):
                    return False, "Unauthorized: only author or community admins/moderators can delete this message"
            
            db.delete(message)
            db.commit()
            return True, "Message deleted successfully"
        except Exception as e:
            db.rollback()
            return False, f"Error deleting message: {str(e)}"
    
    @staticmethod
    def toggle_highlight(db: Session, message_id, user_id):
        """Toggle highlight status for a message (admin/moderator only)"""
        try:
            message = db.query(Message).filter(Message.id == message_id).first()
            if not message:
                return False, "Message not found", 404
            
            # Check if user is admin or moderator
            membership = db.query(CommunityMember).filter_by(
                user_id=user_id,
                community_id=message.community_id
            ).first()
            
            if not membership or membership.role not in ('admin', 'moderator'):
                return False, "Only admins or moderators can highlight messages", 403
            
            from datetime import datetime
            if message.is_highlighted:
                message.is_highlighted = None
                action = "removed highlight"
            else:
                message.is_highlighted = datetime.utcnow()
                action = "highlighted message"
            
            db.commit()
            return True, f"Successfully {action}", 200
        except Exception as e:
            db.rollback()
            return False, f"Error toggling highlight: {str(e)}", 500

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

    @staticmethod
    def toggle_pin(db: Session, message_id, user_id):
        """Toggle pin status for a message (admin/moderator only)"""
        try:
            message = db.query(Message).filter(Message.id == message_id).first()
            if not message:
                return False, "Message not found", 404, None
            
            # Check if user is admin or moderator
            membership = db.query(CommunityMember).filter_by(
                user_id=user_id,
                community_id=message.community_id
            ).first()
            
            if not membership or membership.role not in ('admin', 'moderator'):
                return False, "Only admins or moderators can pin messages", 403, None
            
            if message.is_pinned:
                message.is_pinned = False
                action = "unpinned"
            else:
                # Unpin other messages in the same community
                db.query(Message).filter(
                    Message.community_id == message.community_id,
                    Message.is_pinned == True
                ).update({Message.is_pinned: False}, synchronize_session=False)
                
                message.is_pinned = True
                action = "pinned"
            
            db.commit()
            return True, f"Message successfully {action}", 200, message
        except Exception as e:
            db.rollback()
            return False, f"Error toggling pin: {str(e)}", 500, None
