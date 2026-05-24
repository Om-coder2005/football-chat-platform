import { useEffect, useState, useRef, useCallback } from 'react';
import { communityAPI } from '../services/api';
import { Shield, Sparkles, Trash2, Save, RotateCcw, Lock, Unlock, Play, ClipboardList, Palette, Ruler } from 'lucide-react';

const getDefaultTokens = () => {
  const tokens = [];
  
  // Red Team (Left Side, jerseys 1-11)
  // GK
  tokens.push({ id: 'R1', team: 'red', number: 1, label: 'R1', x: 8, y: 50 });
  // Defenders
  tokens.push({ id: 'R2', team: 'red', number: 2, label: 'R2', x: 22, y: 20 });
  tokens.push({ id: 'R3', team: 'red', number: 3, label: 'R3', x: 20, y: 40 });
  tokens.push({ id: 'R4', team: 'red', number: 4, label: 'R4', x: 20, y: 60 });
  tokens.push({ id: 'R5', team: 'red', number: 5, label: 'R5', x: 22, y: 80 });
  // Midfielders
  tokens.push({ id: 'R6', team: 'red', number: 6, label: 'R6', x: 35, y: 25 });
  tokens.push({ id: 'R7', team: 'red', number: 7, label: 'R7', x: 32, y: 50 });
  tokens.push({ id: 'R8', team: 'red', number: 8, label: 'R8', x: 35, y: 75 });
  // Forwards
  tokens.push({ id: 'R9', team: 'red', number: 9, label: 'R9', x: 45, y: 20 });
  tokens.push({ id: 'R10', team: 'red', number: 10, label: 'R10', x: 43, y: 50 });
  tokens.push({ id: 'R11', team: 'red', number: 11, label: 'R11', x: 45, y: 80 });

  // Blue Team (Right Side, jerseys 1-11)
  // GK
  tokens.push({ id: 'B1', team: 'blue', number: 1, label: 'B1', x: 92, y: 50 });
  // Defenders
  tokens.push({ id: 'B2', team: 'blue', number: 2, label: 'B2', x: 78, y: 20 });
  tokens.push({ id: 'B3', team: 'blue', number: 3, label: 'B3', x: 80, y: 40 });
  tokens.push({ id: 'B4', team: 'blue', number: 4, label: 'B4', x: 80, y: 60 });
  tokens.push({ id: 'B5', team: 'blue', number: 5, label: 'B5', x: 78, y: 80 });
  // Midfielders
  tokens.push({ id: 'B6', team: 'blue', number: 6, label: 'B6', x: 65, y: 25 });
  tokens.push({ id: 'B7', team: 'blue', number: 7, label: 'B7', x: 68, y: 50 });
  tokens.push({ id: 'B8', team: 'blue', number: 8, label: 'B8', x: 65, y: 75 });
  // Forwards
  tokens.push({ id: 'B9', team: 'blue', number: 9, label: 'B9', x: 55, y: 20 });
  tokens.push({ id: 'B10', team: 'blue', number: 10, label: 'B10', x: 57, y: 50 });
  tokens.push({ id: 'B11', team: 'blue', number: 11, label: 'B11', x: 55, y: 80 });

  // Football
  tokens.push({ id: 'ball', team: 'ball', number: '', label: 'B', x: 50, y: 50 });

  return tokens;
};

const TacticBoard = ({ communityId, socket, isConnected, isHost }) => {
  const [tokens, setTokens] = useState(getDefaultTokens());
  const [drawings, setDrawings] = useState([]);
  const [cooperative, setCooperative] = useState(true);
  const [brushColor, setBrushColor] = useState('#ff3b30'); // default red brush
  const [brushSize, setBrushSize] = useState(4);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const drawingsRef = useRef([]);
  const draggedTokenIdRef = useRef(null);

  // Keep drawings ref up to date
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawingsRef.current.forEach((seg) => {
      ctx.beginPath();
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = seg.size;
      ctx.moveTo((seg.x0 / 100) * rect.width, (seg.y0 / 100) * rect.height);
      ctx.lineTo((seg.x1 / 100) * rect.width, (seg.y1 / 100) * rect.height);
      ctx.stroke();
    });
  }, []);

  // Sync canvas size on mount and window resize
  useEffect(() => {
    redrawCanvas();
    window.addEventListener('resize', redrawCanvas);
    const timer = setTimeout(redrawCanvas, 300); // Give layout time to settle
    return () => {
      window.removeEventListener('resize', redrawCanvas);
      clearTimeout(timer);
    };
  }, [redrawCanvas]);

  // Load board state
  const loadBoard = useCallback(async () => {
    try {
      const res = await communityAPI.getTacticBoard(communityId);
      if (res.data.success && res.data.tactic_board) {
        const state = JSON.parse(res.data.tactic_board.board_state || '{}');
        if (state.tokens && state.tokens.length > 0) {
          setTokens(state.tokens);
        } else {
          setTokens(getDefaultTokens());
        }
        const loadedDrawings = state.drawings || [];
        setDrawings(loadedDrawings);
        drawingsRef.current = loadedDrawings;
        if (state.cooperative !== undefined) {
          setCooperative(state.cooperative);
        }
        setTimeout(redrawCanvas, 150);
      }
    } catch (err) {
      console.error('Failed to load board state', err);
    }
  }, [communityId, redrawCanvas]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Handle Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDraw = (data) => {
      if (data.room === communityId) {
        const seg = {
          x0: data.x0,
          y0: data.y0,
          x1: data.x1,
          y1: data.y1,
          color: data.color,
          size: data.size,
        };
        setDrawings((prev) => {
          const next = [...prev, seg];
          drawingsRef.current = next;
          redrawCanvas();
          return next;
        });
      }
    };

    const handleMove = (data) => {
      if (data.room === communityId) {
        setTokens((prev) =>
          prev.map((t) => (t.id === data.tokenId ? { ...t, x: data.x, y: data.y } : t))
        );
      }
    };

    const handleClear = (data) => {
      if (data.room === communityId) {
        setDrawings([]);
        drawingsRef.current = [];
        redrawCanvas();
      }
    };

    const handleCooperative = (data) => {
      if (data.room === communityId) {
        setCooperative(data.cooperative);
      }
    };

    socket.on('tactic:draw', handleDraw);
    socket.on('tactic:move-token', handleMove);
    socket.on('tactic:clear', handleClear);
    socket.on('tactic:toggle-cooperative', handleCooperative);

    return () => {
      socket.off('tactic:draw', handleDraw);
      socket.off('tactic:move-token', handleMove);
      socket.off('tactic:clear', handleClear);
      socket.off('tactic:toggle-cooperative', handleCooperative);
    };
  }, [socket, isConnected, communityId, redrawCanvas]);

  // Drawing mouse/touch handlers
  const getEventCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const hasWritePermission = cooperative || isHost;

  const startDrawing = (e) => {
    if (!hasWritePermission) return;
    const coords = getEventCoordinates(e);
    if (!coords) return;

    isDrawingRef.current = true;
    lastPointRef.current = { x: coords.x, y: coords.y };
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !hasWritePermission) return;
    const coords = getEventCoordinates(e);
    if (!coords) return;

    const x0_pct = (lastPointRef.current.x / coords.width) * 100;
    const y0_pct = (lastPointRef.current.y / coords.height) * 100;
    const x1_pct = (coords.x / coords.width) * 100;
    const y1_pct = (coords.y / coords.height) * 100;

    const seg = {
      x0: x0_pct,
      y0: y0_pct,
      x1: x1_pct,
      y1: y1_pct,
      color: brushColor,
      size: brushSize,
    };

    // Draw locally
    setDrawings((prev) => {
      const next = [...prev, seg];
      drawingsRef.current = next;
      redrawCanvas();
      return next;
    });

    // Send to other clients
    if (socket && isConnected) {
      const token = localStorage.getItem('access_token');
      socket.emit('tactic:draw', {
        room: communityId,
        x0: x0_pct,
        y0: y0_pct,
        x1: x1_pct,
        y1: y1_pct,
        color: brushColor,
        size: brushSize,
        token,
      });
    }

    lastPointRef.current = { x: coords.x, y: coords.y };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  // Draggable markers touch/mouse event logic
  const handleTokenStartDrag = (tokenId) => {
    if (!hasWritePermission) return;
    draggedTokenIdRef.current = tokenId;
  };

  const handleContainerDragOver = (e) => {
    if (!draggedTokenIdRef.current || !hasWritePermission || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    // Clamp coordinates inside the pitch with a margin
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));

    setTokens((prev) =>
      prev.map((t) => (t.id === draggedTokenIdRef.current ? { ...t, x, y } : t))
    );

    if (socket && isConnected) {
      const token = localStorage.getItem('access_token');
      socket.emit('tactic:move-token', {
        room: communityId,
        tokenId: draggedTokenIdRef.current,
        x,
        y,
        token,
      });
    }
  };

  const handleTokenReleaseDrag = () => {
    draggedTokenIdRef.current = null;
  };

  // Drag listeners on document to handle releases outside the pitch
  useEffect(() => {
    const handleMouseUp = () => handleTokenReleaseDrag();
    const handleMouseMove = (e) => {
      if (draggedTokenIdRef.current) {
        handleContainerDragOver(e);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
    };
  }, [socket, isConnected, communityId, cooperative, isHost]);

  // Action buttons
  const handleClear = () => {
    if (!hasWritePermission) return;
    setDrawings([]);
    drawingsRef.current = [];
    redrawCanvas();

    if (socket && isConnected) {
      const token = localStorage.getItem('access_token');
      socket.emit('tactic:clear', {
        room: communityId,
        token,
      });
    }
  };

  const handleResetTokens = () => {
    if (!hasWritePermission) return;
    const defaultTokens = getDefaultTokens();
    setTokens(defaultTokens);

    if (socket && isConnected) {
      const token = localStorage.getItem('access_token');
      defaultTokens.forEach((t) => {
        socket.emit('tactic:move-token', {
          room: communityId,
          tokenId: t.id,
          x: t.x,
          y: t.y,
          token,
        });
      });
    }
  };

  const handleSaveBoard = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        board_state: {
          tokens,
          drawings,
          cooperative,
        },
      };
      const res = await communityAPI.saveTacticBoard(communityId, payload);
      if (res.data.success) {
        setMessage('TACTICS COMMITTED TO DB!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('ERROR SAVING TACTICS');
      }
    } catch (err) {
      setMessage('FAILED TO SAVE TACTICS');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCooperativeMode = () => {
    if (!isHost) return;
    const newCooperative = !cooperative;
    setCooperative(newCooperative);

    if (socket && isConnected) {
      const token = localStorage.getItem('access_token');
      socket.emit('tactic:toggle-cooperative', {
        room: communityId,
        cooperative: newCooperative,
        token,
      });
    }
  };

  return (
    <div className="tactic-board-panel bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-archivo mb-6 relative">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-4 border-black pb-3 mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bebas text-3xl tracking-wide text-black uppercase flex items-center gap-2"><ClipboardList size={26} /> LIVE TACTIC BOARD</h3>
            <span className="animate-pulse bg-green-500 text-black border-2 border-black text-[9px] font-bold px-1.5 uppercase shrink-0">
              {cooperative ? 'PUBLIC CO-OP' : 'HOST ONLY'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Interactive whiteboard for post-match analysis and formation planning
          </p>
        </div>

        {/* Cooperative Mode Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isHost ? (
            <button
              onClick={toggleCooperativeMode}
              className={`flex items-center gap-2 text-xs font-bold uppercase py-1.5 px-3 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] cursor-pointer transition-colors ${
                cooperative ? 'bg-yellow-300 text-black' : 'bg-red-500 text-white'
              }`}
            >
              {cooperative ? <Unlock size={12} /> : <Lock size={12} />}
              {cooperative ? 'CO-OP ON' : 'HOST DRAW ONLY'}
            </button>
          ) : (
            <div className="text-[10px] uppercase font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-1 flex items-center gap-1.5 rounded">
              {cooperative ? <Unlock size={10} /> : <Lock size={10} />}
              {cooperative ? 'DRAW PERMISSION: YES' : 'DRAW PERMISSION: HOST ONLY'}
            </div>
          )}
        </div>
      </div>

      {/* Canvas and Pitch Container */}
      <div
        ref={containerRef}
        className="pitch-wrapper relative w-full aspect-[16/9] md:aspect-[2/1] bg-[#2e7d32] border-4 border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden select-none mb-4 cursor-crosshair"
      >
        {/* Responsive Soccer Pitch SVG Lines */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        >
          {/* Pitch Outer Boundary */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.8" />
          {/* Halfway Line */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="white" strokeWidth="0.8" />
          {/* Center Circle */}
          <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.8" />
          {/* Center Spot */}
          <circle cx="50" cy="50" r="0.8" fill="white" />
          {/* Penalty Boxes */}
          <rect x="2" y="25" width="15" height="50" fill="none" stroke="white" strokeWidth="0.8" />
          <rect x="83" y="25" width="15" height="50" fill="none" stroke="white" strokeWidth="0.8" />
          {/* Goal Areas */}
          <rect x="2" y="38" width="5" height="24" fill="none" stroke="white" strokeWidth="0.8" />
          <rect x="93" y="38" width="5" height="24" fill="none" stroke="white" strokeWidth="0.8" />
          {/* Penalty Spots */}
          <circle cx="12" cy="50" r="0.6" fill="white" />
          <circle cx="88" cy="50" r="0.6" fill="white" />
          {/* Goalposts outlines */}
          <rect x="0.5" y="44" width="1.5" height="12" fill="none" stroke="white" strokeWidth="0.8" />
          <rect x="98" y="44" width="1.5" height="12" fill="none" stroke="white" strokeWidth="0.8" />
        </svg>

        {/* Freehand drawing canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 w-full h-full z-10 ${
            !hasWritePermission ? 'pointer-events-none' : ''
          }`}
        />

        {/* Draggable Jersey Tokens */}
        {tokens.map((token) => {
          const isBall = token.team === 'ball';
          let bgClass = 'bg-red-600 text-white';
          if (token.team === 'blue') {
            bgClass = 'bg-blue-600 text-white';
          } else if (isBall) {
            bgClass = 'bg-white text-black';
          }

          return (
            <div
              key={token.id}
              onMouseDown={() => handleTokenStartDrag(token.id)}
              onTouchStart={() => handleTokenStartDrag(token.id)}
              style={{
                left: `${token.x}%`,
                top: `${token.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isBall ? 25 : 20,
                touchAction: 'none',
              }}
              className={`absolute w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs shadow-[2px_2px_0px_0px_#000] cursor-grab active:cursor-grabbing select-none ${bgClass} pitch-token`}
            >
              {isBall
                ? <Shield size={14} className="text-black" />
                : token.number}
            </div>
          );
        })}
      </div>

      {/* Toolbar / Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t-2 border-black pt-4 bg-gray-50 p-3 border-2 border-black">
        {/* Brush styling tools */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <span className="text-xs uppercase font-bold text-black shrink-0 flex items-center gap-1"><Palette size={13} /> BRUSH:</span>
          <div className="flex items-center gap-1.5 mr-2">
            {[
              { color: '#ff3b30', label: 'RED' },
              { color: '#007aff', label: 'BLUE' },
              { color: '#000000', label: 'BLACK' },
            ].map((brush) => (
              <button
                key={brush.color}
                onClick={() => setBrushColor(brush.color)}
                style={{ backgroundColor: brush.color }}
                className={`w-6 h-6 border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:scale-105 active:scale-95 transition-transform ${
                  brushColor === brush.color ? 'ring-2 ring-yellow-400 border-dashed' : ''
                }`}
                title={brush.label}
              />
            ))}
          </div>

          <span className="text-xs uppercase font-bold text-black shrink-0 flex items-center gap-1"><Ruler size={13} /> SIZE:</span>
          <div className="flex items-center gap-2 w-28 md:w-36">
            <input
              type="range"
              min="2"
              max="12"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-black cursor-pointer h-1.5 bg-gray-300 rounded"
            />
            <span className="text-xs font-bold w-6">{brushSize}px</span>
          </div>
        </div>

        {/* Action control buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {hasWritePermission && (
            <>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs font-bold uppercase py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-600 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer transition-all"
                title="Clear Drawing Canvas"
              >
                <Trash2 size={12} />
                CLEAR CANVAS
              </button>
              <button
                onClick={handleResetTokens}
                className="flex items-center gap-1.5 text-xs font-bold uppercase py-1.5 px-3 bg-blue-100 hover:bg-blue-200 text-blue-600 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer transition-all"
                title="Reset Players & Ball to Lineup"
              >
                <RotateCcw size={12} />
                RESET TOKENS
              </button>
            </>
          )}

          {isHost && (
            <button
              onClick={handleSaveBoard}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-bold uppercase py-1.5 px-4 bg-green-400 hover:bg-green-500 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-all disabled:opacity-50"
              title="Commit & Save Board State to Database"
            >
              <Save size={12} />
              {saving ? 'SAVING...' : 'SAVE STATE'}
            </button>
          )}
        </div>
      </div>

      {/* Floating feedback message */}
      {message && (
        <div className="absolute top-2 right-2 bg-yellow-300 text-black font-bold border-2 border-black py-1 px-3 shadow-[2px_2px_0px_0px_#000] text-[10px] uppercase tracking-widest animate-bounce z-[50]">
          {message}
        </div>
      )}
    </div>
  );
};

export default TacticBoard;
