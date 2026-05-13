import os

community_list_jsx = """import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityAPI } from '../services/api';
import AppHeader from './AppHeader';

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
      fetchMyCommunities();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join community');
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    try {
      await communityAPI.create(newCommunity);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <AppHeader />
        <div className="flex justify-center items-center h-[80vh]">
          <p className="neu-heading text-4xl animate-pulse">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 border-b-4 border-black pb-8 gap-6">
          <div>
            <h1 className="neu-heading text-6xl md:text-8xl">CHOOSE YOUR STAND</h1>
            <p className="font-['Inter'] font-bold text-xl bg-yellow-300 inline-block px-4 py-2 border-2 border-black -rotate-1 shadow-[4px_4px_0px_0px_#000]">Join the firm. Support your local.</p>
          </div>
          <button
            type="button"
            className="neu-button bg-green-500 text-black hover:bg-green-400 rotate-1"
            onClick={() => setShowCreateModal(true)}
          >
            + CREATE COMMUNITY
          </button>
        </header>

        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-['Archivo_Black'] text-3xl uppercase">My Communities</h2>
            <span className="bg-black text-white px-3 py-1 font-bold text-xl rounded-full">{myCommunities.length}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myCommunities.length === 0 ? (
              <div className="neu-box p-8 bg-gray-100 border-dashed col-span-full text-center">
                <p className="font-['Inter'] text-xl font-bold">You haven't joined any communities yet.</p>
              </div>
            ) : (
              myCommunities.map((community, i) => (
                <div key={community.id} className="neu-card bg-yellow-100 flex flex-col justify-between h-64" style={{ transform: `rotate(${i % 2 === 0 ? '-1deg' : '1deg'})` }}>
                  <div>
                    <h3 className="font-['Archivo_Black'] text-2xl uppercase line-clamp-1">{community.name}</h3>
                    <p className="font-['Inter'] font-bold text-gray-600 line-clamp-1 mb-2">{community.club_name || 'General'}</p>
                    <p className="font-['Inter'] text-sm line-clamp-2">{community.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="font-['Archivo_Black'] bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_#000]">{community.member_count} FANS</span>
                    <button className="neu-button py-2 px-4 bg-blue-500 text-white" onClick={() => handleEnterChat(community.id)}>
                      ENTER CHAT
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-['Archivo_Black'] text-3xl uppercase">All Communities</h2>
            <span className="bg-black text-white px-3 py-1 font-bold text-xl rounded-full">{communities.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {communities.map((community) => (
              <div key={community.id} className="neu-card bg-white flex flex-col justify-between h-64">
                <div>
                  <h3 className="font-['Archivo_Black'] text-2xl uppercase line-clamp-1">{community.name}</h3>
                  <p className="font-['Inter'] font-bold text-gray-600 line-clamp-1 mb-2">{community.club_name || 'General'}</p>
                  <p className="font-['Inter'] text-sm line-clamp-2">{community.description}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-['Archivo_Black'] bg-gray-100 border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_#000]">{community.member_count} FANS</span>
                  {isMember(community.id) ? (
                    <button className="neu-button-secondary py-2 px-4" onClick={() => handleEnterChat(community.id)}>
                      CHAT
                    </button>
                  ) : (
                    <button className="neu-button py-2 px-4 bg-red-500 text-white" onClick={() => handleJoinCommunity(community.id)}>
                      + JOIN
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
            <div className="neu-card bg-white max-w-lg w-full -rotate-1" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-['Archivo_Black'] text-3xl uppercase mb-6 bg-green-400 inline-block px-4 py-2 border-2 border-black">CREATE COMMUNITY</h2>
              <form onSubmit={handleCreateCommunity} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Community Name *"
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  required
                  className="neu-input"
                />
                <input
                  type="text"
                  placeholder="Club Name (e.g., Liverpool FC)"
                  value={newCommunity.club_name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, club_name: e.target.value })}
                  className="neu-input"
                />
                <textarea
                  placeholder="Description"
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  rows="4"
                  className="neu-input resize-none"
                />
                <div className="flex gap-4 mt-4">
                  <button type="button" className="neu-button-secondary flex-1" onClick={() => setShowCreateModal(false)}>
                    CANCEL
                  </button>
                  <button type="submit" className="neu-button bg-green-500 text-black flex-1 hover:bg-green-400">
                    CREATE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityList;
"""

with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/CommunityList.jsx", "w", encoding="utf-8") as f:
    f.write(community_list_jsx)

css_file = "d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/styles/CommunityList.css"
if os.path.exists(css_file):
    os.remove(css_file)

print("CommunityList updated to Neubrutalism design and CommunityList.css removed.")
