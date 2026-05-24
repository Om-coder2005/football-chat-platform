import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { stickerAPI } from '../services/api';
import AppHeader from './AppHeader';
import { ShoppingBag, Check, CreditCard, Lock, Sparkles, AlertTriangle } from 'lucide-react';

const ConfettiParticle = ({ delay }) => {
  const randomX = Math.random() * 800 - 400; // Fly left/right
  const randomY = Math.random() * -600 - 200; // Fly up and fall down
  const colors = ['#FF3B30', '#FFCC00', '#4CD964', '#5AC8FA', '#5856D6', '#FF2D55'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 12 + 6;

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
      animate={{
        x: randomX,
        y: randomY,
        scale: [0, 1, 1, 0],
        rotate: Math.random() * 720,
        opacity: [1, 1, 0.8, 0]
      }}
      transition={{
        duration: 1.8,
        ease: "easeOut",
        delay: delay
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
        backgroundColor: color,
        border: '1.5px solid black',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    />
  );
};

const StickerShop = () => {
  const [stickers, setStickers] = useState([]);
  const [groupedStickers, setGroupedStickers] = useState({});
  const [ownedIds, setOwnedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutSticker, setCheckoutSticker] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [cardDetails, setCardDetails] = useState({ card_number: '', expiry: '', cvv: '' });
  const [checkoutError, setCheckoutError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load stickers and owned stickers
        const allRes = await stickerAPI.getAll();
        const myRes = await stickerAPI.getMyOwned();
        
        if (allRes.data.success) {
          setStickers(allRes.data.stickers || []);
          setGroupedStickers(allRes.data.grouped || {});
        }
        if (myRes.data.success) {
          setOwnedIds(myRes.data.sticker_ids || []);
        }
      } catch (err) {
        console.error("Error loading sticker data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenCheckout = (sticker) => {
    setCheckoutSticker(sticker);
    setCardDetails({ card_number: '', expiry: '', cvv: '' });
    setCheckoutError('');
    setPurchaseSuccess(false);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutSticker) return;
    
    setPurchasing(true);
    setCheckoutError('');
    setShakeScreen(false);
    
    try {
      const response = await stickerAPI.purchase(checkoutSticker.id, cardDetails);
      if (response.data.success) {
        setPurchaseSuccess(true);
        setOwnedIds(prev => [...prev, checkoutSticker.id]);
        
        // Trigger massive effects
        setShakeScreen(true);
        setShowConfetti(true);
        
        // Turn off shake after 0.8 seconds
        setTimeout(() => {
          setShakeScreen(false);
        }, 800);
        
        // Turn off confetti generator after 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      }
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Payment authentication failed. Check credentials.');
    } finally {
      setPurchasing(false);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Coaches Memes': return 'bg-lime-300';
      case 'Flags': return 'bg-cyan-300';
      case 'Reactions': return 'bg-amber-300';
      case 'Goal Celebrations': return 'bg-orange-300';
      default: return 'bg-yellow-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="neu-heading text-5xl animate-pulse">LOADING MARKETPLACE...</p>
        </div>
      </div>
    );
  }

  // Generate 80 particles for a high-intensity blast
  const confettiParticles = Array.from({ length: 80 }, (_, i) => i);

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] ${shakeScreen ? 'animate-shake' : ''} transition-all`}>
      <AppHeader />

      {/* Dynamic shake animation injection */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-4px, -3px) rotate(-1.5deg); }
          20% { transform: translate(5px, 4px) rotate(1.5deg); }
          30% { transform: translate(-5px, 2px) rotate(0deg); }
          40% { transform: translate(4px, -2px) rotate(1.5deg); }
          50% { transform: translate(-2px, 4px) rotate(-1.5deg); }
          60% { transform: translate(5px, 2px) rotate(0deg); }
          70% { transform: translate(-4px, -2px) rotate(1.5deg); }
          80% { transform: translate(4px, 4px) rotate(-1.5deg); }
          90% { transform: translate(-2px, -4px) rotate(0deg); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out infinite;
        }
      `}</style>

      {/* CONFETTI LAYER */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-[9999]">
          {confettiParticles.map((idx) => (
            <ConfettiParticle key={idx} delay={idx * 0.02} />
          ))}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header Block */}
        <div className="mb-12 border-b-4 border-black pb-8 relative overflow-hidden bg-yellow-300 p-8 shadow-[8px_8px_0px_0px_#000] border-4 border-black">
          <div className="absolute top-4 right-4 bg-red-500 text-white font-archivo text-lg px-4 py-2 border-4 border-black rotate-6 shadow-[4px_4px_0px_0px_#000]">
            RETRO STICKERS
          </div>
          <h1 className="neu-heading text-6xl md:text-8xl flex items-center gap-4">
            <ShoppingBag size={64} className="stroke-[3]" /> SHOP
          </h1>
          <p className="font-poppins font-bold text-xl mt-4 max-w-2xl">
            Unlock heavy-impact neubrutalist stickers with classic black borders! Use free classic designs or buy premium packs to shake up the stands.
          </p>
        </div>

        {/* Categories Block */}
        <div className="flex flex-col gap-12">
          {Object.entries(groupedStickers).map(([category, items]) => (
            <div key={category} className="flex flex-col gap-6">
              <h2 className="font-archivo text-4xl uppercase border-l-8 border-black pl-4 flex items-center gap-3">
                <Sparkles className="text-yellow-500 fill-current" /> {category}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {items.map((sticker) => {
                  const isFree = sticker.price === 0;
                  const isOwned = isFree || ownedIds.includes(sticker.id);

                  return (
                    <motion.div
                      key={sticker.id}
                      whileHover={{ y: -6, scale: 1.01 }}
                      className="neu-card bg-white flex flex-col justify-between overflow-hidden relative border-4 border-black shadow-[8px_8px_0px_0px_#000] h-[360px]"
                    >
                      {/* Price Badge */}
                      <span className={`absolute top-3 right-3 font-archivo font-bold text-sm uppercase px-3 py-1 border-2 border-black rotate-3 z-10 ${isFree ? 'bg-green-400 text-black' : 'bg-red-500 text-white shadow-[2px_2px_0px_0px_#000]'}`}>
                        {isFree ? 'FREE' : `$${sticker.price}`}
                      </span>

                      {/* Header Category Banner */}
                      <div className={`h-12 border-b-4 border-black px-4 flex items-center justify-between ${getCategoryColor(category)}`}>
                        <span className="font-archivo font-bold text-xs uppercase text-black truncate max-w-[120px]">{category}</span>
                        {isOwned && <span className="bg-white border-2 border-black rounded-full p-0.5"><Check size={12} className="stroke-[3] text-green-600" /></span>}
                      </div>

                      {/* Image Area */}
                      <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 relative border-b-4 border-black">
                        <img 
                          src={sticker.image_url} 
                          alt={sticker.name} 
                          className="max-h-36 max-w-full object-contain filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.85)] border-2 border-black p-2 bg-white"
                        />
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 bg-white flex flex-col gap-2">
                        <h3 className="font-archivo text-lg uppercase truncate">{sticker.name}</h3>
                        
                        {isOwned ? (
                          <div className="bg-green-400 border-4 border-black py-2 text-center font-archivo uppercase text-sm font-bold shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2">
                            <Check size={16} className="stroke-[3]" /> UNLOCKED
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenCheckout(sticker)}
                            className="neu-button w-full bg-yellow-400 text-black py-2 font-archivo uppercase text-sm font-bold flex items-center justify-center gap-2 group cursor-pointer"
                          >
                            <Lock size={14} className="group-hover:rotate-12 transition-transform" /> UNLOCK NOW
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* CHECKOUT MODAL OVERLAY */}
      <AnimatePresence>
        {checkoutSticker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="w-full max-w-md border-4 border-black bg-white shadow-[12px_12px_0px_0px_#000] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b-4 border-black">
                <span className="font-archivo text-xl uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="text-yellow-400" /> SECURE CHECKOUT
                </span>
                {!purchasing && (
                  <button 
                    onClick={() => setCheckoutSticker(null)}
                    className="font-archivo hover:text-red-400 font-bold text-xl"
                  >
                    [X]
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {!purchaseSuccess ? (
                  <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-6">
                    {/* Item Card Details */}
                    <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3 shadow-[4px_4px_0px_0px_#000]">
                      <img 
                        src={checkoutSticker.image_url} 
                        alt="" 
                        className="w-16 h-16 object-contain border-2 border-black bg-white p-1"
                      />
                      <div className="flex-1">
                        <span className="font-poppins text-xs font-bold bg-yellow-300 px-2 py-0.5 border-2 border-black uppercase text-black inline-block">
                          {checkoutSticker.category}
                        </span>
                        <h4 className="font-archivo text-lg uppercase truncate mt-1">{checkoutSticker.name}</h4>
                        <span className="font-archivo text-md font-bold block text-red-500">
                          Total Amount: ${checkoutSticker.price}
                        </span>
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="bg-red-500 text-white font-poppins font-bold border-4 border-black p-3 shadow-[4px_4px_0px_0px_#000] text-sm">
                        <span className="inline-flex items-center gap-2"><AlertTriangle size={18} /> {checkoutError}</span>
                      </div>
                    )}

                    {/* Credit Card Inputs */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="font-archivo text-xs uppercase tracking-wider text-black">Card Number (Mock)</label>
                        <input
                          type="text"
                          required
                          value={cardDetails.card_number}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, card_number: e.target.value }))}
                          placeholder="4111 2222 3333 4444"
                          disabled={purchasing}
                          className="neu-input bg-yellow-50/50"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="font-archivo text-xs uppercase tracking-wider text-black">Expiry Date</label>
                          <input
                            type="text"
                            required
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                            placeholder="MM/YY"
                            disabled={purchasing}
                            className="neu-input bg-yellow-50/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-archivo text-xs uppercase tracking-wider text-black">CVV</label>
                          <input
                            type="password"
                            required
                            maxLength="3"
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                            placeholder="•••"
                            disabled={purchasing}
                            className="neu-input bg-yellow-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button & Retro Spinner Loader */}
                    <div className="pt-2">
                      {purchasing ? (
                        <div className="flex flex-col items-center justify-center py-4 gap-3 bg-black border-4 border-black text-white shadow-[6px_6px_0px_0px_#000]">
                          {/* Retro loading spinner wheel */}
                          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-bebas text-lg tracking-widest animate-pulse uppercase">TRANSMITTING TO GATEWAY...</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="neu-button w-full bg-yellow-400 text-black py-4 font-archivo uppercase text-md font-bold shadow-[6px_6px_0px_0px_#000] cursor-pointer"
                        >
                          AUTHORIZE TRANSACTION
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* Purchase Success State */
                  <div className="flex flex-col items-center justify-center text-center py-6 gap-6">
                    <div className="w-20 h-20 bg-green-400 rounded-full border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_#000]">
                      <Check size={48} className="stroke-[3] text-black" />
                    </div>

                    <div>
                      <h3 className="font-bebas text-4xl tracking-wider text-black uppercase">TRANSACTION AUTHORIZED!</h3>
                      <p className="font-poppins font-bold text-sm text-gray-600 mt-2">
                        Sticker Pack <strong>"{checkoutSticker.name}"</strong> has been mapped to your user profile. Check it out in any community stand!
                      </p>
                    </div>

                    <button
                      onClick={() => setCheckoutSticker(null)}
                      className="neu-button bg-black text-white py-3 px-8 font-archivo uppercase text-sm font-bold shadow-[4px_4px_0px_0px_#000] hover:bg-green-400 hover:text-black cursor-pointer"
                    >
                      CONTINUE SHOPPING
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StickerShop;
