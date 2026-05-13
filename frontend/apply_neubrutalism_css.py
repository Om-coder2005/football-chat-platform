css_content = """@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

:root {
  /* Default Theme: Digital Football Pub */
  --bg-primary: #fdf6e3;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f4e8c1;
  --accent-primary: #ff3b30;
  --accent-secondary: #000000;
  --text-primary: #111111;
  --text-secondary: #444444;
  --border-color: #000000;
  --shadow-color: #000000;
  
  --font-heading: 'Bebas Neue', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-display: 'Archivo Black', sans-serif;
}

/* REAL MADRID THEME: Luxury Brutalism */
body.theme-real-madrid {
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f4;
  --bg-tertiary: #e0e0e0;
  --accent-primary: #cfb53b; /* Gold */
  --accent-secondary: #00529f; /* Blue */
  --text-primary: #000000;
  --text-secondary: #333333;
}

/* BARCELONA THEME: Artistic Expressive */
body.theme-barcelona {
  --bg-primary: #004d98;
  --bg-secondary: #1a62a7;
  --bg-tertiary: #3376b5;
  --accent-primary: #a50044;
  --accent-secondary: #edbb00;
  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --border-color: #000000;
  --shadow-color: #000000;
}

/* CHELSEA THEME: Electric Blue */
body.theme-chelsea {
  --bg-primary: #034694;
  --bg-secondary: #0a52a3;
  --bg-tertiary: #145db3;
  --accent-primary: #ffffff;
  --accent-secondary: #000000;
  --text-primary: #ffffff;
  --text-secondary: #d1d5db;
}

/* LIVERPOOL THEME: Gritty Reds */
body.theme-liverpool {
  --bg-primary: #c8102e;
  --bg-secondary: #db1534;
  --bg-tertiary: #ee1a3b;
  --accent-primary: #00b2a9; /* Teal */
  --accent-secondary: #f6eb61;
  --text-primary: #ffffff;
  --text-secondary: #f8dbd8;
}

body {
  font-family: var(--font-body);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  background-image: radial-gradient(circle, var(--text-primary) 1px, transparent 1px);
  background-size: 20px 20px;
  background-attachment: fixed;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Base styles to fix Tailwind un-resetting buttons if missing */
button, a {
  cursor: pointer;
}

@layer components {
  /* NEUBRUTALISM COMPONENTS */
  
  .neu-box {
    @apply bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] shadow-[6px_6px_0px_0px_var(--shadow-color)] rounded-none transition-transform duration-200;
  }
  
  .neu-box:hover {
    @apply -translate-y-1 translate-x-[-2px] shadow-[8px_8px_0px_0px_var(--shadow-color)];
  }

  .neu-button {
    @apply bg-[var(--accent-primary)] text-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)] font-['Archivo_Black'] uppercase tracking-wider px-6 py-3 transition-all duration-200 active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_var(--shadow-color)];
  }

  .neu-button-secondary {
    @apply bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[3px] border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)] font-['Archivo_Black'] uppercase tracking-wider px-6 py-3 transition-all duration-200 active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_var(--shadow-color)];
  }

  .neu-input {
    @apply bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[3px] border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--shadow-color)] px-4 py-3 font-['Inter'] font-semibold focus:outline-none focus:shadow-[6px_6px_0px_0px_var(--accent-primary)] transition-shadow duration-200;
  }

  .neu-card {
    @apply bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] shadow-[8px_8px_0px_0px_var(--shadow-color)] p-6 relative overflow-hidden;
  }

  .neu-heading {
    @apply font-['Bebas_Neue'] text-5xl md:text-7xl tracking-wide uppercase leading-none drop-shadow-[2px_2px_0px_var(--shadow-color)];
  }

  .neu-badge {
    @apply inline-block bg-[var(--accent-secondary)] text-[var(--bg-primary)] border-[2px] border-[var(--border-color)] px-3 py-1 font-['Archivo_Black'] text-xs uppercase -rotate-2 shadow-[2px_2px_0px_0px_var(--shadow-color)];
  }

  .comic-sticker {
    @apply absolute bg-yellow-300 text-black border-2 border-black font-['Bebas_Neue'] px-2 py-1 rotate-12 shadow-[2px_2px_0px_0px_#000] z-10;
  }
}

/* Chat specific styles */
.chat-bubble-receive {
  @apply bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] shadow-[3px_3px_0px_0px_var(--shadow-color)] rounded-2xl rounded-tl-none p-3 max-w-[80%];
}

.chat-bubble-send {
  @apply bg-[var(--accent-primary)] text-[var(--bg-secondary)] border-2 border-[var(--border-color)] shadow-[3px_3px_0px_0px_var(--shadow-color)] rounded-2xl rounded-tr-none p-3 max-w-[80%];
}

/* Custom Scrollbar for Neubrutalism */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-left: 2px solid var(--border-color);
}
::-webkit-scrollbar-thumb {
  background: var(--accent-primary);
  border: 2px solid var(--border-color);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--accent-secondary);
}

/* Utilities */
.text-stroke {
  -webkit-text-stroke: 1px var(--border-color);
  color: transparent;
}
.text-stroke-2 {
  -webkit-text-stroke: 2px var(--border-color);
  color: transparent;
}
"""

with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/index.css", "w") as f:
    f.write(css_content)

print("Updated index.css with Neubrutalism design system.")
