import { createElement, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, Flame, PartyPopper, ThumbsUp, Zap } from 'lucide-react';

/* ─────────────────────────────────────────────────
   Deterministic particle data derived from seed index
   so the layout is stable across React renders.
───────────────────────────────────────────────── */
const BALL_COUNT = 14;
const CONFETTI_COUNT = 60;

function seededRand(seed) {
  // Simple LCG – good enough for visual effects
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const CONFETTI_COLORS = [
  '#ff3b30', '#ffcc00', '#34c759', '#007aff',
  '#af52de', '#ff9500', '#ffffff', '#5ac8fa',
];

function buildParticles() {
  const rand = seededRand(42);

  const balls = Array.from({ length: BALL_COUNT }, (_, i) => ({
    id: i,
    startX: `${5 + rand() * 90}vw`,
    startY: `${110 + rand() * 40}vh`,
    endX: `${rand() * 100}vw`,
    endY: `${-20 - rand() * 50}vh`,
    size: 28 + rand() * 44,
    delay: rand() * 0.6,
    duration: 1.6 + rand() * 1.4,
    rotate: rand() > 0.5 ? 540 : -540,
  }));

  const confetti = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: `${rand() * 100}vw`,
    yStart: `${-8 - rand() * 10}vh`,
    yEnd: `${100 + rand() * 20}vh`,
    size: 8 + rand() * 14,
    color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
    delay: rand() * 1.2,
    duration: 1.8 + rand() * 1.6,
    skewX: -15 + rand() * 30,
    skewY: -8 + rand() * 16,
    isRect: rand() > 0.5,
  }));

  return { balls, confetti };
}

const { balls, confetti } = buildParticles();

/* ─────────────────────────────────────────────────
   GoalAnimation component
───────────────────────────────────────────────── */
const GoalAnimation = ({ alert }) => {
  // alert = { id, scorer, teamName }
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Dark vignette overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, #000 0%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          {/* ── CONFETTI SHOWER ── */}
          {confetti.map((c) => (
            <motion.div
              key={`conf-${c.id}`}
              initial={{ x: c.x, y: c.yStart, opacity: 1, scaleX: 1, scaleY: 1 }}
              animate={{ y: c.yEnd, opacity: [1, 1, 0], scaleX: [1, 0.4, 1], scaleY: [1, 1.6, 0.6] }}
              transition={{ delay: c.delay, duration: c.duration, ease: 'easeIn' }}
              style={{
                position: 'absolute',
                width: c.size,
                height: c.size * (c.isRect ? 0.4 : 1),
                backgroundColor: c.color,
                borderRadius: c.isRect ? '2px' : '50%',
                transform: `skew(${c.skewX}deg, ${c.skewY}deg)`,
                border: '1.5px solid rgba(0,0,0,0.35)',
              }}
            />
          ))}

          {/* ── SOCCER BALLS ── */}
          {balls.map((b) => (
            <motion.div
              key={`ball-${b.id}`}
              initial={{ x: b.startX, y: b.startY, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{ x: b.endX, y: b.endY, opacity: [1, 1, 0], rotate: b.rotate, scale: 1 }}
              transition={{ delay: b.delay, duration: b.duration, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                fontSize: b.size,
                lineHeight: 1,
                filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.6))',
                userSelect: 'none',
              }}
            >
              <CircleDot size={b.size} strokeWidth={2.5} />
            </motion.div>
          ))}

          {/* ── CENTRAL CARD ── */}
          <motion.div
            initial={{ scale: 0.2, y: 80, opacity: 0, rotate: -8 }}
            animate={{ scale: [0.2, 1.15, 0.95, 1.05, 1], y: 0, opacity: 1, rotate: [-8, 3, -2, 1, 0] }}
            exit={{ scale: 0.4, y: -60, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.45, 0.65, 0.82, 1] }}
            style={{
              position: 'relative',
              zIndex: 10,
              textAlign: 'center',
              background: '#fff',
              border: '6px solid #000',
              boxShadow: '12px 12px 0px 0px #ffcc00, 20px 20px 0px 0px #000',
              padding: '2.5rem 3.5rem',
              maxWidth: '92vw',
            }}
          >
            {/* GOAL label */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 0.55, ease: 'easeInOut' }}
              style={{
                fontFamily: '"Archivo Black", "Bebas Neue", Impact, sans-serif',
                fontSize: 'clamp(4.5rem, 16vw, 9.5rem)',
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: '#000',
                textShadow: '6px 6px 0px #ffcc00',
                userSelect: 'none',
              }}
            >
              GOOOOOAL!
            </motion.div>

            {/* Goal icon accent */}
            <div style={{ lineHeight: 1, margin: '0.4rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.9rem' }}>
              <CircleDot size={48} />
              <PartyPopper size={48} />
              <CircleDot size={48} />
            </div>

            {/* Scorer name */}
            {alert?.scorer && alert.scorer !== 'A Legend' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: 'clamp(1rem, 3.5vw, 2rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#000',
                  background: '#ffcc00',
                  border: '3px solid #000',
                  display: 'inline-block',
                  padding: '0.3em 1em',
                  boxShadow: '4px 4px 0px #000',
                  marginTop: '0.75rem',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={24} /> {alert.scorer}
                </span>
              </motion.div>
            )}

            {/* Team name */}
            {alert?.teamName && alert.teamName !== 'The Champions' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(0.65rem, 2vw, 1rem)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.25em',
                  color: 'rgba(0,0,0,0.55)',
                  marginTop: '0.6rem',
                }}
              >
                {alert.teamName}
              </motion.div>
            )}
          </motion.div>

          {/* Bottom chant bar */}
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ delay: 0.55, duration: 0.45, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#ffcc00',
              borderTop: '5px solid #000',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              overflow: 'hidden',
            }}
          >
            {[
              { text: 'WHAT A GOAL', icon: CircleDot },
              { text: 'ABSOLUTE SCENES', icon: Flame },
              { text: 'BANGER', icon: ThumbsUp },
              { text: 'WHAT A GOAL', icon: CircleDot },
              { text: 'ABSOLUTE SCENES', icon: Flame },
              { text: 'BANGER', icon: ThumbsUp },
            ].map(({ text, icon: Icon }, i) => (
              <motion.span
                key={i}
                animate={{ x: ['0%', '-50%'] }}
                transition={{ repeat: Infinity, duration: 10, ease: 'linear', delay: i * -1.6 }}
                style={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: 'clamp(0.7rem, 1.8vw, 1.1rem)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#000',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  {createElement(Icon, { size: 18 })} {text}
                </span>
                &nbsp;&nbsp;•&nbsp;&nbsp;
              </motion.span>
            ))}
          </motion.div>

          {/* Radial burst rings */}
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={`ring-${i}`}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ delay, duration: 1.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                border: `${6 - i * 1.5}px solid #ffcc00`,
                zIndex: 5,
                pointerEvents: 'none',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoalAnimation;
