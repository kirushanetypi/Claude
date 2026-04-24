// icons.jsx — Lucide-style line icons, inline SVG.
// All 1.5px strokes, round joins, 24×24 viewBox, currentColor.

const Icon = ({ d, size = 20, strokeWidth = 1.5, children, style, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  ArrowUpRight: (p) => <Icon {...p}><path d="M7 17L17 7"/><path d="M7 7h10v10"/></Icon>,
  ArrowDownLeft: (p) => <Icon {...p}><path d="M17 7L7 17"/><path d="M17 17H7V7"/></Icon>,
  ArrowRight: (p) => <Icon {...p}><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></Icon>,
  ArrowLeft: (p) => <Icon {...p}><path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/></Icon>,
  Plus: (p) => <Icon {...p}><path d="M12 5v14"/><path d="M5 12h14"/></Icon>,
  Minus: (p) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></Icon>,
  Bell: (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>,
  Home: (p) => <Icon {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></Icon>,
  CreditCard: (p) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></Icon>,
  Wallet: (p) => <Icon {...p}><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14v4"/><path d="M18 12a2 2 0 1 0 0 4h3v-4h-3z"/></Icon>,
  Calendar: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></Icon>,
  ChartLine: (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-6"/></Icon>,
  TrendingUp: (p) => <Icon {...p}><path d="M22 7L13 16l-4-4-7 7"/><path d="M16 7h6v6"/></Icon>,
  TrendingDown: (p) => <Icon {...p}><path d="M22 17L13 8l-4 4-7-7"/><path d="M16 17h6v-6"/></Icon>,
  Building: (p) => <Icon {...p}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/></Icon>,
  User: (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>,
  MoreHorizontal: (p) => <Icon {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Icon>,
  Filter: (p) => <Icon {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></Icon>,
  ChevronRight: (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  ChevronDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  ChevronUp: (p) => <Icon {...p}><path d="M6 15l6-6 6 6"/></Icon>,
  ChevronLeft: (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>,
  Close: (p) => <Icon {...p}><path d="M18 6L6 18"/><path d="M6 6l12 12"/></Icon>,
  Check: (p) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></Icon>,
  EyeOff: (p) => <Icon {...p}><path d="M9.9 5a10 10 0 0 1 12.1 7 14 14 0 0 1-2 3"/><path d="M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M2 2l20 20"/></Icon>,
  Phone: (p) => <Icon {...p}><path d="M22 17v3a2 2 0 0 1-2.2 2A20 20 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7l.6 3a2 2 0 0 1-.6 2L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.5l3 .6A2 2 0 0 1 22 17z"/></Icon>,
  Zap: (p) => <Icon {...p}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></Icon>,
  Send: (p) => <Icon {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></Icon>,
  Download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></Icon>,
  QrCode: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3"/><path d="M14 20h7"/><path d="M17 17v4"/></Icon>,
  Repeat: (p) => <Icon {...p}><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></Icon>,
  Info: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>,
  AlertCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></Icon>,
  Lock: (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Icon>,
  Dot: (p) => <Icon {...p}><circle cx="12" cy="12" r="2" fill="currentColor"/></Icon>,
  MapPin: (p) => <Icon {...p}><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></Icon>,
  ShoppingBag: (p) => <Icon {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></Icon>,
  Coffee: (p) => <Icon {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/></Icon>,
  Car: (p) => <Icon {...p}><path d="M5 17h14"/><path d="M5 17v-5l2-5h10l2 5v5"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></Icon>,
  Briefcase: (p) => <Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Icon>,
  Gift: (p) => <Icon {...p}><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13"/><path d="M19 12v9H5v-9"/><path d="M7 8a2 2 0 0 1 0-4c3 0 5 4 5 4s2-4 5-4a2 2 0 0 1 0 4"/></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>,
  Circle: (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/></Icon>,
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>,
  List: (p) => <Icon {...p}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></Icon>,
  Star: (p) => <Icon {...p}><path d="M12 2l3.1 6.3 7 1-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-1z"/></Icon>,
};

Object.assign(window, { Icon, Icons });
