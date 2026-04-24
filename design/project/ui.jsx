// ui.jsx — Shared UI primitives, theme-aware via `t` prop (a TOKENS[letter]).
//
// All components accept `t` (tokens) and render accordingly — no CSS variables,
// so the same component renders 3 ways across the 3 variant frames.

const { useState, useRef, useEffect, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// ScreenFrame — the inner scrollable area of a phone. Provides base bg + text color.
// ─────────────────────────────────────────────────────────────
function ScreenFrame({ t, children, style }) {
  return (
    <div style={{
      background: t.bg, color: t.text,
      fontFamily: TYPE.sans,
      width: '100%', height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFeatureSettings: '"ss01", "ss02", "cv11"',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scroll area (no visible scrollbar)
// ─────────────────────────────────────────────────────────────
function Scroll({ children, style }) {
  return (
    <div style={{
      flex: 1, overflowY: 'auto', overflowX: 'hidden',
      scrollbarWidth: 'none', ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Text — semantic sizes
// ─────────────────────────────────────────────────────────────
const txt = {
  eyebrow: { fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: TYPE.mono },
  label:   { fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', fontFamily: TYPE.mono },
  body:    { fontSize: 14, fontWeight: 400, letterSpacing: '-0.01em' },
  bodyS:   { fontSize: 12, fontWeight: 400, letterSpacing: '-0.005em' },
  title:   { fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' },
  h2:      { fontSize: 22, fontWeight: 500, letterSpacing: '-0.025em' },
  display: { fontSize: 42, fontWeight: 500, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' },
  displayBig: { fontSize: 48, fontWeight: 500, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' },
  num:     { fontFamily: TYPE.mono, fontVariantNumeric: 'tabular-nums' },
};
// Display font helper — respects per-theme displayFont override (e.g. Ledger serifs)
function dsp(t, size) {
  return {
    fontFamily: t.displayFont || TYPE.sans,
    fontWeight: t.displayWeight ?? 500,
    fontSize: size,
    letterSpacing: t.displayFont && t.displayFont.includes('serif') ? '-0.01em' : '-0.035em',
    fontVariantNumeric: 'tabular-nums',
  };
}

// ─────────────────────────────────────────────────────────────
// Card — theme-aware surface
// ─────────────────────────────────────────────────────────────
function Card({ t, children, style, pad = true, level = 1, onClick }) {
  const bg = level === 0 ? 'transparent' : level === 2 ? t.surface2 : t.surface;
  const density = DENSITY[t.density];
  return (
    <div onClick={onClick} style={{
      background: bg,
      border: t.borderStyle === 'sharp' ? `1px solid ${t.hairline}` : `0.5px solid ${t.hairline}`,
      borderRadius: t.radius,
      padding: pad ? `${density.cardY}px ${density.cardX}px` : 0,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Button — primary/secondary/ghost variants
// ─────────────────────────────────────────────────────────────
function Button({ t, children, variant = 'primary', size = 'md', onClick, icon, style, full }) {
  const h = size === 'sm' ? 32 : size === 'lg' ? 52 : 44;
  const base = {
    height: h, padding: `0 ${size === 'sm' ? 12 : 18}px`,
    borderRadius: t.radius, fontFamily: TYPE.sans,
    fontSize: size === 'sm' ? 12 : 14, fontWeight: 500, letterSpacing: '-0.01em',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, cursor: 'pointer', border: 'none',
    width: full ? '100%' : 'auto',
    transition: 'opacity 0.15s, background 0.15s',
  };
  const variants = {
    primary:   { background: t.accent, color: t.accentInk },
    secondary: { background: t.surface2, color: t.text, border: `0.5px solid ${t.hairline2}` },
    ghost:     { background: 'transparent', color: t.text2, border: `0.5px solid ${t.hairline}` },
    danger:    { background: t.surface2, color: t.neg, border: `0.5px solid ${t.hairline2}` },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {icon}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Row — list row primitive
// ─────────────────────────────────────────────────────────────
function Row({ t, leading, title, subtitle, trailingTop, trailingBottom, onClick, style, dense }) {
  const d = DENSITY[t.density];
  const py = dense ? d.rowY - 2 : d.rowY;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: `${py}px ${d.rowX}px`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {leading && <div style={{ flexShrink: 0 }}>{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...txt.body, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {(trailingTop || trailingBottom) && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {trailingTop && <div style={{ ...txt.body, ...txt.num, color: t.text }}>{trailingTop}</div>}
          {trailingBottom && <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{trailingBottom}</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IconTile — little circle/square with an icon
// ─────────────────────────────────────────────────────────────
function IconTile({ t, children, color, size = 36, square }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: square ? t.radiusSm : 999,
      background: color ?? t.surface3,
      color: t.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────
function Divider({ t, style }) {
  return <div style={{ height: 1, background: t.hairline, ...style }} />;
}

// ─────────────────────────────────────────────────────────────
// Segmented control
// ─────────────────────────────────────────────────────────────
function Segmented({ t, options, value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 28 : 34;
  return (
    <div style={{
      display: 'inline-flex', background: t.surface2,
      borderRadius: t.radius, padding: 2,
      border: `0.5px solid ${t.hairline}`,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange?.(o.value)} style={{
            height: h, padding: '0 12px', border: 'none',
            background: active ? t.surface3 : 'transparent',
            color: active ? t.text : t.text3,
            borderRadius: t.radius - 2 < 0 ? 0 : t.radius - 2,
            fontFamily: TYPE.sans, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', letterSpacing: '-0.005em',
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────
function Progress({ t, value, color, height = 4 }) {
  return (
    <div style={{ height, background: t.surface3, borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`, height: '100%',
        background: color ?? t.accent, borderRadius: height,
        transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sparkline — tiny line chart
// ─────────────────────────────────────────────────────────────
function Sparkline({ points, width = 100, height = 28, color, fill }) {
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const n = points.length;
  const pad = 1;
  const xs = (i) => pad + (i * (width - 2 * pad)) / (n - 1);
  const ys = (v) => height - pad - ((v - min) / range) * (height - 2 * pad);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  const fillD = `${d} L${xs(n-1).toFixed(1)},${height} L${xs(0).toFixed(1)},${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={fillD} fill={fill} />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// NumberPad — 3x4 grid, for bottom-sheet amount entry
// ─────────────────────────────────────────────────────────────
function NumberPad({ t, onKey }) {
  const keys = ['1','2','3','4','5','6','7','8','9','.', '0','⌫'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
      {keys.map(k => (
        <button key={k} onClick={() => onKey?.(k)} style={{
          height: 56, border: 'none', background: 'transparent',
          color: t.text, fontFamily: TYPE.mono, fontSize: 22, fontWeight: 400,
          cursor: 'pointer', letterSpacing: '-0.01em',
          borderTop: `0.5px solid ${t.hairline}`,
        }}>{k}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────
function Chip({ t, children, active, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 28, padding: '0 10px',
      background: active ? t.accentDim : t.surface2,
      color: active ? t.accent : t.text2,
      border: `0.5px solid ${active ? t.accent : t.hairline}`,
      borderRadius: t.radius === 0 ? 0 : 999,
      fontFamily: TYPE.sans, fontSize: 11, fontWeight: 500,
      letterSpacing: '-0.005em', cursor: 'pointer',
    }}>
      {icon}{children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat — label + big number
// ─────────────────────────────────────────────────────────────
function Stat({ t, label, value, sub, align = 'left' }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ ...txt.label, color: t.text3, marginBottom: 4 }}>{label}</div>
      <div style={{ ...txt.num, fontSize: 20, fontWeight: 500, color: t.text, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab bar — bottom nav
// ─────────────────────────────────────────────────────────────
function TabBar({ t, items, value, onChange }) {
  return (
    <div style={{
      display: 'flex', borderTop: `0.5px solid ${t.hairline}`,
      background: t.bg, padding: '8px 4px 12px',
    }}>
      {items.map(it => {
        const active = it.key === value;
        return (
          <button key={it.key} onClick={() => onChange?.(it.key)} style={{
            flex: 1, background: 'transparent', border: 'none',
            padding: '6px 4px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, cursor: 'pointer',
            color: active ? t.text : t.text3,
          }}>
            {it.icon}
            <span style={{ fontSize: 9, fontFamily: TYPE.mono, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  ScreenFrame, Scroll, txt, dsp, Card, Button, Row, IconTile, Divider,
  Segmented, Progress, Sparkline, NumberPad, Chip, Stat, TabBar,
});
