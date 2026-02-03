import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityAPI } from '../services/api';
import '../styles/CommunityList.css';

const CommunityList = () => {
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    club_name: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunities();
    fetchMyCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const response = await communityAPI.getAll();
      setCommunities(response.data.communities || []);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCommunities = async () => {
    try {
      const response = await communityAPI.getMy();
      setMyCommunities(response.data.communities || []);
    } catch (error) {
      console.error('Error fetching my communities:', error);
    }
  };

  const handleJoinCommunity = async (id) => {
    try {
      await communityAPI.join(id);
      alert('Successfully joined community!');
      fetchMyCommunities();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join community');
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    try {
      await communityAPI.create(newCommunity);
      alert('Community created successfully!');
      setShowCreateModal(false);
      setNewCommunity({ name: '', description: '', club_name: '' });
      fetchCommunities();
      fetchMyCommunities();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create community');
    }
  };

  const handleEnterChat = (communityId) => {
    navigate(`/community/${communityId}`);
  };

  const isMember = (communityId) => {
    return myCommunities.some((c) => c.id === communityId);
  };

  if (loading) return <div className="loading">Loading communities...</div>;

  return (
    <div className="community-list-container">
      <header className="community-header">
        <h1>⚽ Football Fan Communities</h1>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + Create Community
        </button>
      </header>

      <section className="my-communities-section">
        <h2>My Communities ({myCommunities.length})</h2>
        <div className="communities-grid">
          {myCommunities.length === 0 ? (
            <p className="empty-state">You haven't joined any communities yet.</p>
          ) : (
            myCommunities.map((community) => (
              <div key={community.id} className="community-card my-community">
                <h3>{community.name}</h3>
                <p className="club-name">{community.club_name}</p>
                <p className="description">{community.description}</p>
                <div className="card-footer">
                  <span className="member-count">👥 {community.member_count} members</span>
                  <button className="chat-btn" onClick={() => handleEnterChat(community.id)}>
                    💬 Enter Chat
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="all-communities-section">
        <h2>All Communities ({communities.length})</h2>
        <div className="communities-grid">
          {communities.map((community) => (
            <div key={community.id} className="community-card">
              <h3>{community.name}</h3>
              <p className="club-name">{community.club_name}</p>
              <p className="description">{community.description}</p>
              <div className="card-footer">
                <span className="member-count">👥 {community.member_count} members</span>
                {isMember(community.id) ? (
                  <button className="chat-btn" onClick={() => handleEnterChat(community.id)}>
                    💬 Chat
                  </button>
                ) : (
                  <button className="join-btn" onClick={() => handleJoinCommunity(community.id)}>
                    ➕ Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Community</h2>
            <form onSubmit={handleCreateCommunity}>
              <input
                type="text"
                placeholder="Community Name *"
                value={newCommunity.name}
                onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Club Name (e.g., Liverpool FC)"
                value={newCommunity.club_name}
                onChange={(e) => setNewCommunity({ ...newCommunity, club_name: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newCommunity.description}
                onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                rows="4"
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityList;
