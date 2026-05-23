import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import AppHeader from './AppHeader';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        if (response.data.success) {
          setUser(response.data.user);
          setAvatarUrl(response.data.user.avatar_url || '');
          setBio(response.data.user.bio || '');
          setFavoriteClub(response.data.user.favorite_club || '');
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
        else setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updateData = { avatar_url: avatarUrl, bio, favorite_club: favoriteClub };
      if (newPassword) {
        if (!currentPassword) {
          setError('Current password is required to set a new password.');
          setSaving(false);
          return;
        }
        updateData.current_password = currentPassword;
        updateData.new_password = newPassword;
      }
      const response = await authAPI.updateProfile(updateData);
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="neu-heading text-5xl animate-pulse">LOADING PROFILE...</p>
        </div>
      </div>
    );
  }

  const profileImage = avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=ff3b30&color=fff&size=150&bold=true`;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-12 border-b-4 border-black pb-8 relative overflow-hidden">
          <div className="comic-sticker top-0 right-4 rotate-[8deg] bg-blue-400 text-white text-xl px-4 py-2 hidden md:block">MY PROFILE</div>
          <h1 className="neu-heading text-7xl">FAN PROFILE</h1>
          <p className="font-poppins font-bold text-xl bg-yellow-300 inline-block px-4 py-2 border-4 border-black -rotate-1 shadow-[6px_6px_0px_0px_#000] mt-4">
            @{user?.username} — {user?.favorite_club || 'True Football Fan'}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Left: Identity Card */}
          <div className="md:col-span-1 flex flex-col gap-6">
            {/* Avatar Card */}
            <div className="neu-card bg-white overflow-hidden relative">
              <div className="h-24 bg-black flex items-center justify-center relative">
                <span className="font-bebas text-5xl text-yellow-400 tracking-widest drop-shadow-[2px_2px_0px_#fff]">CASA ULTRAS</span>
              </div>
              <div className="px-6 pb-6 relative">
                <div className="flex justify-center -mt-12 mb-4">
                  <div className="relative">
                    <img
                      src={profileImage}
                      alt={user?.username}
                      className="w-24 h-24 object-cover border-4 border-black shadow-[6px_6px_0px_0px_#000]"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${user?.username}&background=ff3b30&color=fff&size=150&bold=true`;
                      }}
                    />
                    {user?.is_active && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-black"></span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="font-archivo text-2xl uppercase">@{user?.username}</h2>
                  <p className="font-poppins font-bold text-gray-600 text-sm mb-3">{user?.email}</p>
                  {user?.favorite_club && (
                    <div className="inline-block bg-yellow-300 border-4 border-black px-3 py-1 font-archivo text-sm uppercase shadow-[4px_4px_0px_0px_#000] rotate-1 mb-3">
                      ⚽ {user.favorite_club}
                    </div>
                  )}
                  {user?.bio && (
                    <p className="font-poppins font-bold text-gray-700 text-sm italic mb-4 bg-gray-100 border-4 border-black p-3 text-left shadow-[4px_4px_0px_0px_#000]">
                      "{user.bio}"
                    </p>
                  )}
                  <div className="border-t-4 border-black pt-4 mt-2 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-100 border-4 border-black p-3 shadow-[4px_4px_0px_0px_#000]">
                      <p className="font-archivo text-3xl">{user?.communities?.length || 0}</p>
                      <p className="font-poppins font-bold text-xs uppercase">Communities</p>
                    </div>
                    <div className="bg-green-300 border-4 border-black p-3 shadow-[4px_4px_0px_0px_#000]">
                      <p className="font-archivo text-xl uppercase">Active</p>
                      <p className="font-poppins font-bold text-xs uppercase">Status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Communities */}
            <div className="neu-card bg-white">
              <h3 className="font-archivo text-xl uppercase mb-4 border-b-4 border-black pb-2">My Stands</h3>
              {user?.communities?.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                  {user.communities.map((community, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      key={community.id}
                      className="flex items-center justify-between p-3 bg-gray-100 border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all cursor-pointer"
                      onClick={() => navigate(`/community/${community.id}`)}
                    >
                      <div>
                        <h4 className="font-archivo text-sm uppercase">{community.name}</h4>
                        <p className="font-poppins font-bold text-xs text-gray-500 capitalize">{community.role}</p>
                      </div>
                      <span className="font-archivo text-sm">→</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="font-poppins font-bold text-gray-600 mb-4">You haven't joined any communities yet.</p>
                  <button
                    onClick={() => navigate('/communities')}
                    className="neu-button bg-blue-500 text-white text-sm py-2 px-4"
                  >
                    FIND A COMMUNITY
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Settings Form */}
          <div className="md:col-span-2">
            <div className="neu-card bg-white">
              <h2 className="font-archivo text-3xl uppercase mb-6 border-b-4 border-black pb-4">Update Your Kit</h2>

              {error && (
                <div className="bg-red-500 text-white font-poppins font-bold border-4 border-black p-3 mb-6 shadow-[4px_4px_0px_0px_#000]">
                  ⚠️ {error}
                </div>
              )}
              {success && (
                <div className="bg-green-400 text-black font-poppins font-bold border-4 border-black p-3 mb-6 shadow-[4px_4px_0px_0px_#000]">
                  ✅ {success}
                </div>
              )}

              <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-archivo uppercase tracking-wider text-black">Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/my-avatar.jpg"
                    className="neu-input"
                  />
                  <p className="font-poppins text-xs font-bold text-gray-500">Leave blank to use the default initials avatar.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-archivo uppercase tracking-wider text-black">Favorite Club</label>
                  <input
                    type="text"
                    value={favoriteClub}
                    onChange={(e) => setFavoriteClub(e.target.value)}
                    placeholder="e.g. Real Madrid, Arsenal, AC Milan"
                    className="neu-input"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-archivo uppercase tracking-wider text-black">Short Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the community a bit about yourself..."
                    rows="3"
                    maxLength="150"
                    className="neu-input resize-none"
                  />
                  <p className="font-poppins font-bold text-xs text-right text-gray-500">{bio.length}/150</p>
                </div>

                <div className="border-t-4 border-black pt-6">
                  <h3 className="font-archivo text-xl uppercase mb-4 bg-red-500 text-white inline-block px-4 py-1 border-4 border-black shadow-[4px_4px_0px_0px_#000]">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-archivo uppercase text-sm text-black">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="neu-input"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-archivo uppercase text-sm text-black">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="neu-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="neu-button bg-yellow-400 text-black text-xl py-4 px-10 disabled:opacity-50"
                  >
                    {saving ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
