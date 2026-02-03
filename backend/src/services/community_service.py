from sqlalchemy.orm import Session
from src.db.models.community import Community
from src.db.models.community_member import CommunityMember
from src.db.models.message import Message

class CommunityService:
    @staticmethod
    def create_community(db: Session, name, description, club_name, creator_id):
        """Create a new community and make creator an admin"""
        # Check if name already exists
        existing = db.query(Community).filter(Community.name == name).first()
        if existing:
            return False, "Community name already exists", None
        
        try:
            # Create community
            community = Community(
                name=name,
                description=description,
                club_name=club_name,
                member_count=1
            )
            db.add(community)
            db.flush()  # Get community.id
            
            # Add creator as admin
            member = CommunityMember(
                user_id=creator_id,
                community_id=community.id,
                role='admin'
            )
            db.add(member)
            db.commit()
            db.refresh(community)
            return True, "Community created successfully", community
        except Exception as e:
            db.rollback()
            return False, f"Error creating community: {str(e)}", None
    
    @staticmethod
    def get_all_communities(db: Session):
        """Get all public communities"""
        return db.query(Community).filter(Community.is_public == True).all()
    
    @staticmethod
    def get_community_by_id(db: Session, community_id):
        """Get community by ID"""
        return db.query(Community).filter(Community.id == community_id).first()
    
    @staticmethod
    def join_community(db: Session, community_id, user_id):
        """Add user to community"""
        # Check if already a member
        existing = db.query(CommunityMember).filter_by(
            user_id=user_id,
            community_id=community_id
        ).first()
        
        if existing:
            return False, "Already a member of this community"
        
        try:
            # Add member
            member = CommunityMember(user_id=user_id, community_id=community_id)
            db.add(member)
            
            # Increment member count
            community = db.query(Community).get(community_id)
            if community:
                community.member_count += 1
            
            db.commit()
            return True, "Successfully joined community"
        except Exception as e:
            db.rollback()
            return False, f"Error joining community: {str(e)}"
    
    @staticmethod
    def leave_community(db: Session, community_id, user_id):
        """Remove user from community"""
        member = db.query(CommunityMember).filter_by(
            user_id=user_id,
            community_id=community_id
        ).first()
        
        if not member:
            return False, "Not a member of this community"
        
        try:
            db.delete(member)
            
            # Decrement member count
            community = db.query(Community).get(community_id)
            if community:
                community.member_count -= 1
            
            db.commit()
            return True, "Successfully left community"
        except Exception as e:
            db.rollback()
            return False, f"Error leaving community: {str(e)}"
    
    @staticmethod
    def is_member(db: Session, user_id, community_id):
        """Check if user is a member of community"""
        member = db.query(CommunityMember).filter_by(
            user_id=user_id,
            community_id=community_id
        ).first()
        return member is not None
    
    @staticmethod
    def get_user_communities(db: Session, user_id):
        """Get all communities user is a member of"""
        memberships = db.query(CommunityMember).filter_by(user_id=user_id).all()
        return [m.community for m in memberships]
