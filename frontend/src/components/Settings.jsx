import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import AppHeader from './AppHeader';
import { Palette, MessageSquare, Type, CheckCircle2 } from 'lucide-react';

const THEMES = [
  { id: 'digital-pub', name: 'Digital Pub',   color: '#fdf6e3', highlight: '#ff3b30' },
  { id: 'madrid',      name: 'Madrid White',   color: '#f5f5f5', highlight: '#cfb53b' },
  { id: 'barcelona',    name: 'Blaugrana',       color: '#004d98', highlight: '#a50044' },
  { id: 'chelsea',      name: 'Electric Blue',   color: '#034694', highlight: '#c8a400' },
  { id: 'liverpool',    name: 'Gritty Reds',     color: '#c8102e', highlight: '#f6eb61' },
];

const Settings = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', color:'var(--text-primary)' }}>
      <AppHeader />

      <main style={{ maxWidth:'900px', margin:'0 auto', padding:'3rem 1.5rem' }}>
        {/* Header */}
        <div style={{ borderBottom:'4px solid var(--border-color)', paddingBottom:'2rem', marginBottom:'2.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{ background:'var(--accent-primary)', border:'3px solid var(--border-color)', boxShadow:'4px 4px 0 var(--shadow-color)', width:56, height:56, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Palette size={28} color="var(--text-on-accent)" />
          </div>
          <div>
            <h1 className="neu-heading" style={{ fontSize:'3.5rem' }}>THEME &amp; KIT</h1>
            <span className="comic-sticker" style={{ display:'inline-block', marginTop:'0.4rem' }}>Personalize your matchday look</span>
          </div>
        </div>

        {/* Theme Picker */}
        <section style={{ marginBottom:'3rem' }}>
          <h2 style={{ fontFamily:'var(--font-bebas)', fontSize:'2rem', textTransform:'uppercase', color:'var(--text-primary)', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Palette size={24} /> Select Your Colors
          </h2>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'1.25rem' }}>
            {THEMES.map(t => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    background: active ? 'var(--highlight-bg)' : 'var(--card-bg)',
                    border: active ? '4px solid var(--border-color)' : '3px solid var(--border-color)',
                    boxShadow: active ? '6px 6px 0 var(--shadow-color)' : '4px 4px 0 var(--shadow-color)',
                    padding:'1rem',
                    cursor:'pointer',
                    textAlign:'left',
                    transform: active ? 'scale(1.04)' : 'none',
                    transition:'all 0.15s',
                    position:'relative',
                  }}
                >
                  {/* Color swatch */}
                  <div style={{ width:'100%', height:60, display:'flex', border:'3px solid #000', boxShadow:'3px 3px 0 #000', marginBottom:'0.75rem', overflow:'hidden' }}>
                    <div style={{ flex:2, background:t.color }} />
                    <div style={{ flex:1, background:t.highlight }} />
                  </div>
                  <span style={{ fontFamily:'var(--font-archivo)', fontSize:'0.9rem', textTransform:'uppercase', color: active ? 'var(--highlight-text)' : 'var(--text-primary)', display:'block', fontWeight: 800 }}>
                    {t.name}
                  </span>
                  {active && (
                    <div style={{ position:'absolute', top:-10, right:-10, background:'#10b981', border:'2px solid #000', borderRadius:'50%', padding:2 }}>
                      <CheckCircle2 size={18} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Coming Soon */}
        <section style={{ borderTop:'4px solid var(--border-color)', paddingTop:'2.5rem', opacity:0.6 }}>
          <h2 style={{ fontFamily:'var(--font-bebas)', fontSize:'2rem', textTransform:'uppercase', color:'var(--text-primary)', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Type size={24} /> Chat Customization
            <span className="comic-sticker" style={{ fontSize:'0.65rem', marginLeft:'0.5rem' }}>COMING SOON</span>
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', cursor:'not-allowed' }}>
            {[
              { icon: MessageSquare, label:'Message Bubbles', desc:'Rounded, Square, or Minimal.' },
              { icon: Type,          label:'Font Family',     desc:'Inter, Bebas, or Mono.' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ border:'3px solid var(--border-color)', background:'var(--bg-tertiary)', padding:'1.25rem', boxShadow:'3px 3px 0 var(--shadow-color)' }}>
                <Icon size={20} color="var(--text-secondary)" style={{ marginBottom:'0.5rem' }} />
                <p style={{ fontFamily:'var(--font-archivo)', fontSize:'1rem', textTransform:'uppercase', color:'var(--text-primary)', marginBottom:'0.25rem' }}>{label}</p>
                <p style={{ fontFamily:'var(--font-poppins)', fontWeight:700, fontSize:'0.85rem', color:'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
