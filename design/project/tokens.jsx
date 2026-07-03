// tokens.jsx — Design tokens for 3 visual directions
// Conservative (A) · Moderate (B) · Bold (C)
//
// All 3 share: dark base, Geist Sans + Geist Mono, Lucide icons, dense grid.
// They differ in: accent color, contrast level, surface treatment, border style,
// density, radius, motion philosophy.

const TOKENS = {
  // ─────────────────────────────────────────────────────────────
  // A — Conservative: banking-grade, safe, Bloomberg-dark.
  // Uses off-black surfaces with subtle elevation. Muted veilance green
  // only on primary CTAs + live data. Hairlines for separation.
  // ─────────────────────────────────────────────────────────────
  // A — Ledger: warm cream paper, accounting book aesthetic, serif display,
  // ruled lines, green/red ink. Light mode. Feels like a hand-kept journal.
  // All three directions share Pulse's layout DNA (soft radii, comfortable
  // density, editorial type, sans-serif display). They differ only in palette.
  A: {
    name: 'Paper',
    tagline: 'Light · Warm',
    mode: 'light',
    bg:        '#f4f0e8',
    surface:   '#faf7ef',
    surface2:  '#ede7d8',
    surface3:  '#e0d8c4',
    hairline:  'rgba(60,50,30,0.10)',
    hairline2: 'rgba(60,50,30,0.18)',
    text:      '#1f1a14',
    text2:     '#5a4f3d',
    text3:     '#8a7f6a',
    text4:     '#b5a890',
    accent:    '#1f5f3a',
    accentInk: '#f4f0e8',
    accentDim: 'rgba(31,95,58,0.10)',
    pos:       '#1f5f3a',
    neg:       '#a8351c',
    warn:      '#b87d1a',
    info:      '#2a5f8a',
    radius:    16,
    radiusLg:  24,
    radiusSm:  10,
    density:   'comfortable',
    borderStyle: 'soft',
    displayFont: '"Geist", sans-serif',
    displayWeight: 500,
  },
  // ─────────────────────────────────────────────────────────────
  // B — Moderate: editorial, softer. Slightly warmer neutrals, larger
  // radii, more whitespace. Accent used more freely as highlight.
  // ─────────────────────────────────────────────────────────────
  // B — Pulse: soft dark, generous radii, warm paper-dark, single bright
  // accent (sunset coral), editorial large type. Calm, modern.
  B: {
    name: 'Pulse',
    tagline: 'Dark · Coral',
    mode: 'dark',
    bg:        '#14100c',
    surface:   '#1e1812',
    surface2:  '#2a2218',
    surface3:  '#3a3020',
    hairline:  'rgba(255,240,220,0.08)',
    hairline2: 'rgba(255,240,220,0.14)',
    text:      '#f5eddf',
    text2:     '#c8bba5',
    text3:     '#8a7d67',
    text4:     '#5c5240',
    accent:    '#ff7a47',        // sunset coral
    accentInk: '#14100c',
    accentDim: 'rgba(255,122,71,0.16)',
    pos:       '#9adb7a',
    neg:       '#ff7a47',
    warn:      '#f3c176',
    info:      '#89b3ff',
    radius:    16,
    radiusLg:  24,
    radiusSm:  10,
    density:   'comfortable',
    borderStyle: 'soft',
    displayFont: '"Geist", sans-serif',
    displayWeight: 500,
  },
  // ─────────────────────────────────────────────────────────────
  // C — Bold: maximalist, expressive. Monospaced numerals everywhere,
  // brutalist hairline grids, accent as structural element (bars, fills).
  // Data dashboards à la Bloomberg terminal × MoMA.
  // ─────────────────────────────────────────────────────────────
  // C — Terminal: pure CRT phosphor green on black, mono everywhere,
  // ASCII-tables, 1px sharp grids. Bloomberg × CLI aesthetic.
  C: {
    name: 'Noir',
    tagline: 'Dark · Mint',
    mode: 'dark',
    bg:        '#0c0e0d',
    surface:   '#14171a',
    surface2:  '#1c2024',
    surface3:  '#272c31',
    hairline:  'rgba(255,255,255,0.07)',
    hairline2: 'rgba(255,255,255,0.13)',
    text:      '#edf2ef',
    text2:     '#a8b2ac',
    text3:     '#737b76',
    text4:     '#4a504c',
    accent:    '#7be5b3',
    accentInk: '#0c0e0d',
    accentDim: 'rgba(123,229,179,0.14)',
    pos:       '#7be5b3',
    neg:       '#ff8a70',
    warn:      '#f3c176',
    info:      '#89b3ff',
    radius:    16,
    radiusLg:  24,
    radiusSm:  10,
    density:   'comfortable',
    borderStyle: 'soft',
    displayFont: '"Geist", sans-serif',
    displayWeight: 500,
  },
};

// Shared tokens
const TYPE = {
  sans: '"Geist", "Geist Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// Density → padding scale used across list rows, cards, bottom sheets.
const DENSITY = {
  dense:       { rowY: 10, rowX: 14, cardY: 12, cardX: 14, gap: 8  },
  medium:      { rowY: 13, rowX: 16, cardY: 14, cardX: 16, gap: 10 },
  comfortable: { rowY: 16, rowX: 18, cardY: 18, cardX: 18, gap: 12 },
};

// Format helpers — tabular numerals, Russian locale
function fmtRub(n, { sign = false, cents = false } = {}) {
  const abs = Math.abs(n);
  const main = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(abs);
  const s = n < 0 ? '−' : (sign && n > 0 ? '+' : '');
  return `${s}${main}\u00A0₽`;
}
function fmtPct(n, { digits = 1 } = {}) {
  return `${n.toFixed(digits)}%`;
}
function fmtCardMask(last4) {
  return `•• ${last4}`;
}

Object.assign(window, { TOKENS, TYPE, DENSITY, fmtRub, fmtPct, fmtCardMask });
