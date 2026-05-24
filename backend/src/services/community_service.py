from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from src.db.models.community import Community
from src.db.models.community_member import CommunityMember
from src.db.models.user import User
from src.db.models.new_models import CommunityBan

class CommunityService:
    VALID_ROLES = {'member', 'moderator', 'admin'}

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
        return db.query(Community).filter(Community.is_public.is_(True)).all()
    
    @staticmethod
    def get_community_by_id(db: Session, community_id):
        """Get community by ID"""
        return db.query(Community).filter(Community.id == community_id).first()
    
    @staticmethod
    def join_community(db: Session, community_id, user_id):
        """Add user to community"""
        # Check if user is banned
        ban = db.query(CommunityBan).filter_by(
            community_id=community_id,
            user_id=user_id
        ).first()
        if ban:
            return False, f"You are banned from this community. Reason: {ban.reason or 'No reason provided'}"

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
            community = db.get(Community, community_id)
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
            community = db.get(Community, community_id)
            if community and community.member_count > 0:
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
        memberships = (
            db.query(CommunityMember)
            .options(joinedload(CommunityMember.community))
            .filter_by(user_id=user_id)
            .all()
        )
        return [m.community for m in memberships]
 
    @staticmethod
    def get_community_members(db: Session, community_id):
        """Get members of a community with public profile and role details"""
        memberships = (
            db.query(CommunityMember)
            .options(joinedload(CommunityMember.user))
            .filter(CommunityMember.community_id == community_id)
            .order_by(CommunityMember.joined_at.asc())
            .all()
        )

        members = []
        for membership in memberships:
            members.append({
                "user_id": membership.user.id,
                "username": membership.user.username,
                "avatar_url": membership.user.avatar_url,
                "favorite_club": membership.user.favorite_club,
                "role": membership.role,
                "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
                "muted_until": membership.muted_until.isoformat() if membership.muted_until else None,
                "warnings_count": membership.warnings_count or 0
            })

        return members

    @staticmethod
    def get_membership(db: Session, user_id, community_id):
        """Get membership record for a user in a community"""
        return db.query(CommunityMember).filter_by(
            user_id=user_id,
            community_id=community_id
        ).first()

    @staticmethod
    def update_member_role(db: Session, community_id, actor_user_id, target_user_id, new_role):
        """Update a community member role (admin only)"""
        role = (new_role or '').strip().lower()
        if role not in CommunityService.VALID_ROLES:
            return False, "Invalid role", 400

        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership:
            return False, "You are not a member of this community", 403
        if actor_membership.role != 'admin':
            return False, "Only admins can update member roles", 403

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404

        # Query admin count once for both checks below
        admin_count = db.query(CommunityMember).filter_by(
            community_id=community_id,
            role='admin'
        ).count()

        if target_membership.user_id == actor_user_id and role != 'admin':
            if admin_count <= 1:
                return False, "You cannot demote yourself as the last admin", 400

        if target_membership.role == 'admin' and role != 'admin':
            if admin_count <= 1:
                return False, "Cannot demote the last admin", 400

        try:
            target_membership.role = role
            db.commit()
            return True, "Member role updated successfully", 200
        except Exception as e:
            db.rollback()
            return False, f"Error updating member role: {str(e)}", 500

    @staticmethod
    def transfer_ownership(db: Session, community_id, actor_user_id, target_user_id):
        """Transfer admin ownership from actor to target user"""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership or actor_membership.role != 'admin':
            return False, "Only admins can transfer ownership", 403

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404

        try:
            # Promote target to admin
            target_membership.role = 'admin'
            # Demote actor to moderator (or keep as admin if you want multiple admins, 
            # but usually "transfer" implies demoting self)
            actor_membership.role = 'moderator'
            
            db.commit()
            return True, f"Ownership transferred to {target_membership.user.username}", 200
        except Exception as e:
            db.rollback()
            return False, f"Error transferring ownership: {str(e)}", 500

    @staticmethod
    def add_member_by_identifier(db: Session, community_id, actor_user_id, identifier):
        """Add a member to the community by username or email (admin only)"""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership or actor_membership.role != 'admin':
            return False, "Only admins can add members directly", 403

        # Find target user
        normalized_identifier = identifier.strip().lower()
        target_user = db.query(User).filter(
            (func.lower(User.username) == normalized_identifier) | (func.lower(User.email) == normalized_identifier)
        ).first()

        if not target_user:
            return False, "User not found", 404

        # Check if banned
        ban = db.query(CommunityBan).filter_by(
            community_id=community_id,
            user_id=target_user.id
        ).first()
        if ban:
            return False, f"User is banned from this community. Reason: {ban.reason or 'No reason provided'}", 400

        # Check if already a member
        existing = CommunityService.get_membership(db, target_user.id, community_id)
        if existing:
            return False, "User is already a member", 400

        try:
            member = CommunityMember(user_id=target_user.id, community_id=community_id)
            db.add(member)
            
            community = db.get(Community, community_id)
            if community:
                community.member_count += 1
            
            db.commit()
            return True, f"Added {target_user.username} to the community", 201
        except Exception as e:
            db.rollback()
            return False, f"Error adding member: {str(e)}", 500

    @staticmethod
    def remove_member(db: Session, community_id, actor_user_id, target_user_id):
        """Remove a member from a community (admin only)"""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership:
            return False, "You are not a member of this community", 403
        if actor_membership.role != 'admin':
            return False, "Only admins can remove members", 403

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404

        if target_membership.user_id == actor_user_id:
            return False, "Admins cannot remove themselves", 400

        if target_membership.role == 'admin':
            admin_count = db.query(CommunityMember).filter_by(
                community_id=community_id,
                role='admin'
            ).count()
            if admin_count <= 1:
                return False, "Cannot remove the last admin", 400

        try:
            db.delete(target_membership)

            community = db.get(Community, community_id)
            if community and community.member_count > 0:
                community.member_count -= 1

            db.commit()
            return True, "Member removed successfully", 200
        except Exception as e:
            db.rollback()
            return False, f"Error removing member: {str(e)}", 500

    @staticmethod
    def mute_member(db: Session, community_id, actor_user_id, target_user_id, duration_minutes=10):
        """Mute a member in a community (admin/moderator only)"""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership or actor_membership.role not in ('admin', 'moderator'):
            return False, "Only admins and moderators can mute members", 403

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404

        # Hierarchy check
        role_weights = {'admin': 3, 'moderator': 2, 'member': 1}
        if role_weights.get(actor_membership.role, 0) <= role_weights.get(target_membership.role, 0):
            return False, "You do not have permission to moderate this user due to role hierarchy", 403

        from datetime import datetime, timedelta
        try:
            target_membership.muted_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
            db.commit()
            return True, f"User muted successfully for {duration_minutes} minutes", 200
        except Exception as e:
            db.rollback()
            return False, f"Error muting user: {str(e)}", 500

    @staticmethod
    def warn_member(db: Session, community_id, actor_user_id, target_user_id):
        """Warn a member in a community (admin/moderator only). Automute on 3 warnings."""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership or actor_membership.role not in ('admin', 'moderator'):
            return False, "Only admins and moderators can warn members", 403, False

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404, False

        # Hierarchy check
        role_weights = {'admin': 3, 'moderator': 2, 'member': 1}
        if role_weights.get(actor_membership.role, 0) <= role_weights.get(target_membership.role, 0):
            return False, "You do not have permission to moderate this user due to role hierarchy", 403, False

        from datetime import datetime, timedelta
        try:
            target_membership.warnings_count = (target_membership.warnings_count or 0) + 1
            muted = False
            if target_membership.warnings_count >= 3:
                target_membership.muted_until = datetime.utcnow() + timedelta(hours=24)
                target_membership.warnings_count = 0  # Reset
                muted = True
                msg = "User warned. Warning count hit 3; automatically muted for 24 hours."
            else:
                msg = f"User warned successfully. Warnings count: {target_membership.warnings_count}/3"
            
            db.commit()
            return True, msg, 200, muted
        except Exception as e:
            db.rollback()
            return False, f"Error warning user: {str(e)}", 500, False

    @staticmethod
    def ban_member(db: Session, community_id, actor_user_id, target_user_id, reason=None):
        """Ban a member from a community (admin/moderator only)"""
        actor_membership = CommunityService.get_membership(db, actor_user_id, community_id)
        if not actor_membership or actor_membership.role not in ('admin', 'moderator'):
            return False, "Only admins and moderators can ban members", 403

        target_membership = CommunityService.get_membership(db, target_user_id, community_id)
        if not target_membership:
            return False, "Target user is not a member of this community", 404

        # Hierarchy check
        role_weights = {'admin': 3, 'moderator': 2, 'member': 1}
        if role_weights.get(actor_membership.role, 0) <= role_weights.get(target_membership.role, 0):
            return False, "You do not have permission to moderate this user due to role hierarchy", 403

        try:
            # Create ban entry
            ban = CommunityBan(
                community_id=community_id,
                user_id=target_user_id,
                banned_by=actor_user_id,
                reason=reason
            )
            db.add(ban)
            
            # Delete membership
            db.delete(target_membership)
            
            # Decrement member count
            community = db.get(Community, community_id)
            if community and community.member_count > 0:
                community.member_count -= 1

            db.commit()
            return True, "User banned successfully", 200
        except Exception as e:
            db.rollback()
            return False, f"Error banning user: {str(e)}", 500
