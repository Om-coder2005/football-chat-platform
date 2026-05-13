import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityAPI } from '../services/api';
import AppHeader from './AppHeader';
import { Plus, Users, ArrowRight } from 'lucide-react';

const CommunityList = () => {
  const [communities, setCommunities]     = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunity, setNewCommunity]   = useState({ name: '', description: '', club_name: '' });
  const navigate = useNavigate();

  useEffect(() => { 
    fetchCommunities(); 
    fetchMyCommunities(); 
  }, []);

  const fetchCommunities = async () => {
    try { 
      const r = await communityAPI.getAll(); 
      setCommunities(r.data.communities || []); 
    } catch {
      // Error handled by silence or global toast
    } finally { 
      setLoading(false); 
    }
  };

  const fetchMyCommunities = async () => {
    try { 
      const r = await communityAPI.getMy(); 
      setMyCommunities(r.data.communities || []); 
    } catch {}
  };

  const handleJoin = async (id) => {
    try { 
      await communityAPI.join(id); 
      fetchMyCommunities(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to join community'); 
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try { 
      await communityAPI.create(newCommunity); 
      setShowCreateModal(false); 
      setNewCommunity({ name: '', description: '', club_name: '' }); 
      fetchCommunities(); 
      fetchMyCommunities(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to create community'); 
    }
  };

  const isMember = (id) => myCommunities.some(c => c.id === id);

  const AccentColors = ['var(--highlight-bg)', '#ff3b30', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'];

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="flex justify-center items-center h-[60vh]">
        <h2 className="neu-heading text-6xl animate-pulse">LOADING…</h2>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-16 border-b-4 border-black pb-8 flex flex-wrap justify-between items-end gap-6 relative overflow-hidden">
          <div className="comic-sticker-abs top-0 right-4 rotate-[-6deg] hidden md:block">SELECT YOUR FIRM</div>
          <div className="max-w-2xl">
            <h1 className="neu-heading text-7xl md:text-[100px] mb-4">CHOOSE YOUR STAND</h1>
            <p className="font-inter font-bold text-xl bg-yellow-300 inline-block px-4 py-2 border-2 border-black rotate-1 shadow-[4px_4px_0px_0px_#000]">
              Join the firm. Support your local.
            </p>
          </div>
          <button 
            className="neu-button bg-green-400 text-black text-lg py-4 px-8" 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={24} /> CREATE COMMUNITY
          </button>
        </div>

        {/* My Communities */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-bebas text-5xl tracking-widest uppercase">YOUR ACTIVE STANDS</h2>
            <div className="h-1 flex-1 bg-black"></div>
            <span className="font-archivo bg-black text-white px-4 py-2 text-xl shadow-[4px_4px_0px_0px_#ff3b30]">
              {myCommunities.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myCommunities.length === 0 ? (
              <div className="neu-card col-span-full bg-white/50 border-dashed border-4 flex flex-col items-center justify-center py-16 text-center">
                <p className="font-archivo text-2xl mb-4 text-gray-400">NO COMMUNITIES JOINED YET</p>
                <p className="font-inter font-bold text-gray-500">Pick a stand from the list below to start chatting!</p>
              </div>
            ) : myCommunities.map((c, i) => (
              <div 
                key={c.id} 
                className="neu-card flex flex-col justify-between min-h-[250px] group"
                style={{ 
                  background: AccentColors[i % AccentColors.length],
                  transform: i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)'
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="comic-sticker bg-white text-black text-sm">MEMBER</span>
                  </div>
                  <h3 className="font-archivo text-3xl uppercase text-black mb-1 leading-tight group-hover:underline decoration-4">
                    {c.name}
                  </h3>
                  <p className="font-inter font-extrabold text-black/60 uppercase tracking-tighter">
                    {c.club_name || 'General'}
                  </p>
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                  <div className="flex items-center gap-2 font-archivo bg-white border-2 border-black px-3 py-1 shadow-[3px_3px_0px_0px_#000]">
                    <Users size={16} /> {c.member_count}
                  </div>
                  <button 
                    className="neu-button bg-black text-white py-2 px-6 group-hover:translate-x-1" 
                    onClick={() => navigate(`/community/${c.id}`)}
                  >
                    ENTER STAND <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Communities */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-bebas text-5xl tracking-widest uppercase">THE TERRACES</h2>
            <div className="h-1 flex-1 bg-black"></div>
            <span className="font-archivo bg-black text-white px-4 py-2 text-xl shadow-[4px_4px_0px_0px_#3b82f6]">
              {communities.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {communities.map((c, i) => (
              <div key={c.id} className="neu-card bg-white flex flex-col justify-between min-h-[250px]">
                <div>
                  <h3 className="font-archivo text-2xl uppercase mb-1 leading-tight">{c.name}</h3>
                  <p className="font-inter font-bold text-gray-500 uppercase text-xs mb-3 tracking-widest">
                    {c.club_name || 'General Discussion'}
                  </p>
                  <p className="font-inter text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {c.description}
                  </p>
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                  <div className="font-archivo text-sm bg-gray-100 border-2 border-black px-3 py-1 shadow-[3px_3px_0px_0px_#000]">
                    {c.member_count} FANS
                  </div>
                  {isMember(c.id)
                    ? <button className="neu-button-secondary py-2 px-6" onClick={() => navigate(`/community/${c.id}`)}>GO TO STAND</button>
                    : <button className="neu-button bg-red-500 text-white py-2 px-8" onClick={() => handleJoin(c.id)}>JOIN FIRM</button>
                  }
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-[100] p-6" 
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="neu-card max-w-lg w-full bg-white rotate-[-1deg]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-8 border-b-4 border-black pb-4 flex justify-between items-center">
              <h2 className="neu-heading text-4xl">START A FIRM</h2>
              <button onClick={() => setShowCreateModal(false)} className="font-archivo text-2xl">×</button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="font-archivo text-sm uppercase tracking-wider block">FIRM NAME *</label>
                <input 
                  className="neu-input" 
                  type="text" 
                  placeholder="e.g. North Bank Ultras" 
                  value={newCommunity.name} 
                  onChange={e => setNewCommunity({...newCommunity, name: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label className="font-archivo text-sm uppercase tracking-wider block">CLUB REPRESENTED</label>
                <input 
                  className="neu-input" 
                  type="text" 
                  placeholder="e.g. Arsenal FC" 
                  value={newCommunity.club_name} 
                  onChange={e => setNewCommunity({...newCommunity, club_name: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="font-archivo text-sm uppercase tracking-wider block">FIRM MANIFESTO</label>
                <textarea 
                  className="neu-input" 
                  placeholder="What are your rules?" 
                  value={newCommunity.description} 
                  onChange={e => setNewCommunity({...newCommunity, description: e.target.value})} 
                  rows="3" 
                  style={{ resize: 'none' }} 
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  className="neu-button-secondary flex-1" 
                  onClick={() => setShowCreateModal(false)}
                >
                  ABANDON
                </button>
                <button 
                  type="submit" 
                  className="neu-button bg-green-400 text-black flex-1"
                >
                  CREATE FIRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityList;
