// screens.jsx — 9 screens, theme-aware via `t`.
// This is a PERSONAL FINANCE TRACKER, not a bank app.
// No topup/withdraw/card-issuance/QR/invite/cashback flows.
// Users track, forecast, and plan — they don't transact here.

const { useState: _useState, useMemo: _useMemo } = React;

// ─── Shared bits ──────────────────────────────────────────
function HeaderBar({ t, title, right, left, sticky = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px 10px', gap: 8,
      position: sticky ? 'sticky' : 'relative', top: 0, zIndex: 5,
      background: t.bg, borderBottom: `0.5px solid ${t.hairline}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {left}
        <div style={{ ...txt.title, color: t.text, whiteSpace: 'nowrap', fontFamily: t.allMono ? TYPE.mono : TYPE.sans }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
    </div>
  );
}

function BackBtn({ t, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', color: t.text2,
      width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0, marginLeft: -4,
    }}><Icons.ChevronLeft size={22}/></button>
  );
}

function IconBtn({ t, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', color: t.text2,
      width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0,
    }}>{children}</button>
  );
}

function BottomPad() { return <div style={{ height: 12 }} />; }

// Unified Pulse layout style across all themes.

// ═══════════════════════════════════════════════════════════
// 1. DASHBOARD
// ═══════════════════════════════════════════════════════════
function ScreenDashboard({ t, nav }) {
  const assets = ACCOUNTS.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts  = ACCOUNTS.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  const net = assets + debts;

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t}
        title="Финансы"
        left={<div style={{ width: 28, height: 28, borderRadius: 999, background: t.surface3, color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{USER.initials}</div>}
        right={<><IconBtn t={t}><Icons.Search size={18}/></IconBtn><IconBtn t={t} onClick={() => nav.go('profile')}><Icons.Settings size={18}/></IconBtn></>}
      />
      <Scroll>
        {/* NET WORTH HERO */}
        <div style={{ padding: '18px 16px 20px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ЧИСТЫЕ АКТИВЫ</div>
            <div style={{ ...dsp(t, 44), color: t.text, lineHeight: 1 }}>{fmtRub(net)}</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
              <div>
                <div style={{ ...txt.label, color: t.text3 }}>АКТИВЫ</div>
                <div style={{ ...txt.num, fontSize: 13, color: t.pos, marginTop: 2 }}>{fmtRub(assets)}</div>
              </div>
              <div>
                <div style={{ ...txt.label, color: t.text3 }}>ДОЛГИ</div>
                <div style={{ ...txt.num, fontSize: 13, color: t.neg, marginTop: 2 }}>{fmtRub(debts)}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <Sparkline points={[120,130,148,160,172,180,166,147]} width={80} height={28} color={t.accent} fill={`${t.accent}15`}/>
              </div>
            </div>
          </div>
        </div>

        {/* Directional-specific FORECAST TEASER */}
        <div style={{ padding: '0 16px 16px' }}>
          <div onClick={() => nav.go('calendar')} style={{
            cursor: 'pointer',
            background: t.surface,
            border: `0.5px solid ${t.hairline}`,
            borderRadius: t.radius, padding: 14, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ ...txt.label, color: t.warn, marginBottom: 4 }}>⚠ КАССОВЫЙ РАЗРЫВ 15 МАЯ</div>
                <div style={{ ...dsp(t, 24), color: t.text, lineHeight: 1 }}>{fmtRub(-8_420)}</div>
                <div style={{ ...txt.bodyS, color: t.text3, marginTop: 4 }}>Прогноз до платежа по ипотеке</div>
              </div>
              <Sparkline points={[148,142,138,135,92,85,70,45,20,-8]} width={90} height={40} color={t.warn} fill={`${t.warn}22`}/>
            </div>
          </div>
        </div>

        {/* ACCOUNTS */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ ...txt.label, color: t.text3 }}>СЧЕТА · 4</div>
            <div style={{ ...txt.label, color: t.text3 }}>БАЛАНС</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: DENSITY[t.density].gap }}>
            {ACCOUNTS.map((a, i) => <AccountRow key={a.id} t={t} a={a} onClick={() => nav.push('account', a.id)} isFirst={i===0}/>)}
          </div>
        </div>

        {/* CATEGORIES */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ ...txt.label, color: t.text3 }}>РАСХОДЫ ПО КАТЕГОРИЯМ · АПР</div>
          </div>
          <Card t={t} pad={false}>
            {CATEGORIES.slice(0, 5).map((c, i) => (
              <div key={c.key} style={{ padding: '12px 14px', borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }}/>
                    <div style={{ ...txt.body, color: t.text }}>{c.key}</div>
                  </div>
                  <div style={{ ...txt.num, fontSize: 12, color: t.text2 }}>
                    <span style={{ color: t.text }}>{fmtRub(c.spent)}</span>
                    <span style={{ color: t.text4 }}> / {fmtRub(c.limit)}</span>
                  </div>
                </div>
                <Progress t={t} value={(c.spent/c.limit)*100} color={c.spent/c.limit > 0.9 ? t.neg : c.color} height={2}/>
              </div>
            ))}
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

function AccountRow({ t, a, onClick, isFirst }) {
  const isDebt = a.balance < 0;
  const iconByKind = {
    debit: <Icons.Wallet size={14}/>,
    credit: <Icons.CreditCard size={14}/>,
    savings: <Icons.TrendingUp size={14}/>,
    loan: <Icons.Building size={14}/>,
  };
  return (
    <Card t={t} onClick={onClick} pad={false}>
      <div style={{ padding: `${DENSITY[t.density].cardY}px ${DENSITY[t.density].cardX}px`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconTile t={t} size={32} square color={t.surface3}>{iconByKind[a.id]}</IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ ...txt.body, color: t.text }}>{a.name}</div>
            <div style={{ ...txt.label, color: t.text4, opacity: 1 }}>{fmtCardMask(a.last4)}</div>
          </div>
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>
            {a.kind}{a.rate != null && ` · ${fmtPct(a.rate)}`}{a.limit && ` · лимит ${fmtRub(a.limit)}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...txt.num, fontSize: 15, fontWeight: 500, color: t.text }}>{fmtRub(a.balance)}</div>
          {a.id === 'savings' && <div style={{ ...txt.label, fontSize: 10, color: t.text3, marginTop: 2 }}>{Math.round(a.balance/a.goal*100)}% ЦЕЛИ</div>}
          {a.id === 'credit' && <div style={{ ...txt.label, fontSize: 10, color: t.accent, marginTop: 2 }}>ГРЕЙС · {daysUntil(a.graceDate)}Д</div>}
          {a.id === 'loan' && <div style={{ ...txt.label, fontSize: 10, color: t.text3, marginTop: 2 }}>{a.paidMonths}/{a.termMonths}</div>}
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. CALENDAR + FORECAST (with DATE PICKER)
// ═══════════════════════════════════════════════════════════
function ScreenCalendar({ t, nav }) {
  const forecast = _useMemo(() => forecastBalance(147_820, 60), []);
  const minPoint = forecast.reduce((m, p) => p.balance < m.balance ? p : m, forecast[0]);

  const today = TODAY;
  // two-month grid
  const buildCells = (monthOffset) => {
    const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const days = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(today.getFullYear(), today.getMonth() + monthOffset, d));
    return { month: first, cells: out };
  };
  const months = [buildCells(0), buildCells(1)];

  const eventsForDay = (d) => UPCOMING.filter(e => e.date.getDate() === d.getDate() && e.date.getMonth() === d.getMonth());
  const txsForDay = (d) => TXS.filter(x => x.date.getDate() === d.getDate() && x.date.getMonth() === d.getMonth());
  const balanceAt = (d) => {
    const found = forecast.find(p => p.date.getDate() === d.getDate() && p.date.getMonth() === d.getMonth());
    return found ? found.balance : null;
  };

  const [selected, setSelected] = _useState(new Date(today.getFullYear(), today.getMonth()+1, 15));
  const selectedEvents = eventsForDay(selected);
  const selectedTxs = txsForDay(selected);
  const selectedBalance = balanceAt(selected);
  const sameDay = selected.getDate() === today.getDate() && selected.getMonth() === today.getMonth();

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t}
        title="Календарь"
        left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}
      />
      <Scroll>
        {/* FORECAST HERO — balance at selected date */}
        <div style={{ padding: '14px 16px 8px', position: 'relative' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>БАЛАНС НА {fmtDate(selected).toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ ...dsp(t, 38), color: selectedBalance != null && selectedBalance < 0 ? t.neg : t.text, lineHeight: 1 }}>
              {selectedBalance != null ? fmtRub(selectedBalance) : '—'}
            </div>
            {sameDay && <div style={{ ...txt.label, color: t.text3 }}>СЕГОДНЯ</div>}
          </div>
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 6 }}>
            {selectedBalance != null && selectedBalance < 0 ? 'Потребуется пополнить счёт' :
             selectedBalance != null && selectedBalance < 30_000 ? 'Низкий остаток' :
             'Прогноз по планируемым операциям'}
          </div>
        </div>

        {/* CHART with marker on selected */}
        <div style={{ padding: '10px 16px 12px' }}>
          <ForecastChart t={t} data={forecast} selected={selected} onSelect={setSelected}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <div style={{ ...txt.label, color: t.text3 }}>МИНИМУМ</div>
              <div style={{ ...txt.num, fontSize: 14, color: minPoint.balance < 0 ? t.neg : t.text, marginTop: 2 }}>{fmtRub(minPoint.balance)} · {fmtDate(minPoint.date)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...txt.label, color: t.text3 }}>+60 ДН.</div>
              <div style={{ ...txt.num, fontSize: 14, color: t.text, marginTop: 2 }}>{fmtRub(forecast[forecast.length-1].balance)}</div>
            </div>
          </div>
        </div>

        {/* MONTH GRID — 2 months */}
        {months.map((m, mi) => (
          <div key={mi} style={{ padding: '8px 16px' }}>
            <div style={{ ...txt.label, color: t.text3, margin: '6px 0' }}>
              {MONTHS_RU_FULL[m.month.getMonth()].toUpperCase()} 2026
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DOW_RU.map(d => <div key={d} style={{ ...txt.label, fontSize: 9, color: t.text4, textAlign: 'center' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {m.cells.map((d, i) => {
                if (!d) return <div key={i} style={{ height: 42 }}/>;
                const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
                const isSel = d.getDate() === selected.getDate() && d.getMonth() === selected.getMonth();
                const events = eventsForDay(d);
                const hasIncome = events.some(e => e.amount > 0);
                const hasExpense = events.some(e => e.amount < 0);
                const bal = balanceAt(d);
                const isLow = bal != null && bal < 10_000;
                return (
                  <button key={i} onClick={() => setSelected(d)} style={{
                    height: 42,
                    background: isSel ? t.accent : (isLow ? `${t.neg}15` : 'transparent'),
                    border: isToday ? `1px solid ${t.accent}` : `0.5px solid ${t.hairline}`,
                    borderRadius: t.radiusSm, cursor: 'pointer',
                    padding: 3, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between',
                    fontFamily: TYPE.mono,
                  }}>
                    <span style={{ fontSize: 11, color: isSel ? t.accentInk : (isToday ? t.accent : t.text), textAlign: 'left' }}>{d.getDate()}</span>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      {hasIncome && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSel ? t.accentInk : t.pos }}/>}
                      {hasExpense && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSel ? t.accentInk : t.neg }}/>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* SELECTED DAY */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>
            {fmtDate(selected, { long: true }).toUpperCase()} · ОПЕРАЦИИ
          </div>
          {(selectedEvents.length + selectedTxs.length) === 0 ? (
            <div style={{ ...txt.bodyS, color: t.text4, padding: '20px 0', textAlign: 'center' }}>Нет операций</div>
          ) : (
            <Card t={t} pad={false}>
              {selectedEvents.map((e, i) => (
                <div key={'e'+i} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                  <Row t={t}
                    leading={<IconTile t={t} size={28} square>{e.amount > 0 ? <Icons.ArrowDownLeft size={13}/> : <Icons.ArrowUpRight size={13}/>}</IconTile>}
                    title={e.title}
                    subtitle={<span style={{ color: t.text4 }}>ЗАПЛАНИРОВАНО</span>}
                    trailingTop={<span style={{ color: e.amount > 0 ? t.pos : t.text }}>{fmtRub(e.amount, { sign: true })}</span>}
                  />
                </div>
              ))}
              {selectedTxs.map((x, i) => (
                <div key={'t'+i} style={{ borderTop: (i || selectedEvents.length) ? `0.5px solid ${t.hairline}` : 'none' }}>
                  <Row t={t}
                    leading={<IconTile t={t} size={28} square>{Icons[x.icon]({size:13})}</IconTile>}
                    title={x.title}
                    subtitle={`${x.cat} · ${fmtTime(x.date)}`}
                    trailingTop={<span style={{ color: x.amount > 0 ? t.pos : t.text }}>{fmtRub(x.amount, { sign: true })}</span>}
                  />
                </div>
              ))}
            </Card>
          )}
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

function ForecastChart({ t, data, selected, onSelect }) {
  const W = 340, H = 110;
  const ref = React.useRef(null);
  const values = data.map(d => d.balance);
  const min = Math.min(...values, 0), max = Math.max(...values, 200_000);
  const range = max - min || 1;
  const xs = (i) => (i * W) / (data.length - 1);
  const ys = (v) => H - ((v - min) / range) * H;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(d.balance).toFixed(1)}`).join(' ');
  const fillPath = `${path} L${W},${H} L0,${H} Z`;
  const zeroY = ys(0);

  const selectedIdx = data.findIndex(d => d.date.getDate() === selected.getDate() && d.date.getMonth() === selected.getMonth());
  const selX = selectedIdx >= 0 ? xs(selectedIdx) : null;
  const selY = selectedIdx >= 0 ? ys(data[selectedIdx].balance) : null;

  const handleMove = (e) => {
    if (!ref.current || !onSelect) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = x / rect.width;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))));
    onSelect(data[idx].date);
  };

  return (
    <div ref={ref} onClick={handleMove} onTouchMove={e => e.touches[0] && handleMove(e.touches[0])} style={{
      width: '100%', background: t.surface, border: `0.5px solid ${t.hairline}`, borderRadius: t.radius, padding: 10, cursor: 'crosshair',
    }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H*f} y2={H*f} stroke={t.hairline} strokeWidth="0.5"/>)}
        {zeroY < H && zeroY > 0 && <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke={t.neg} strokeWidth="0.5" strokeDasharray="2 2"/>}
        <path d={fillPath} fill={`${t.accent}20`}/>
        <path d={path} stroke={t.accent} strokeWidth="1.5" fill="none"/>
        {selX != null && (
          <g>
            <line x1={selX} x2={selX} y1={0} y2={H} stroke={t.accent} strokeWidth="1"/>
            <circle cx={selX} cy={selY} r="4" fill={t.accent} stroke={t.bg} strokeWidth="2"/>
          </g>
        )}
        <text x="4" y={H+12} fill={t.text4} fontSize="8" fontFamily={TYPE.mono}>{fmtDate(data[0].date)}</text>
        <text x={W-4} y={H+12} fill={t.text4} fontSize="8" fontFamily={TYPE.mono} textAnchor="end">{fmtDate(data[data.length-1].date)}</text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3-6. ACCOUNT DETAILS (dispatch)
// ═══════════════════════════════════════════════════════════
function ScreenAccount({ t, nav }) {
  const acctId = nav.param || 'debit';
  const a = ACCOUNTS.find(x => x.id === acctId);
  const acctTxs = TXS.filter(x => x.acct === acctId).slice(0, 8);

  if (a.id === 'credit') return <ScreenCreditCard t={t} nav={nav} a={a} txs={acctTxs}/>;
  if (a.id === 'loan')   return <ScreenLoan t={t} nav={nav} a={a}/>;
  if (a.id === 'savings')return <ScreenSavings t={t} nav={nav} a={a}/>;
  return <ScreenDebit t={t} nav={nav} a={a} txs={acctTxs}/>;
}

function ScreenDebit({ t, nav, a, txs }) {
  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title={a.name} left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}
        right={<IconBtn t={t}><Icons.MoreHorizontal size={18}/></IconBtn>}/>
      <Scroll>
        <div style={{ padding: '18px 16px 10px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>{`ДЕБЕТОВАЯ · ${fmtCardMask(a.last4)}`}</div>
          <div style={{ ...dsp(t, 44), color: t.text, lineHeight: 1 }}>{fmtRub(a.balance)}</div>
          <div style={{ ...txt.bodyS, color: t.pos, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icons.TrendingUp size={12}/> +{fmtRub(15_000)} за неделю
          </div>
        </div>

        <div style={{ padding: '10px 16px 14px' }}>
          <Card t={t}>
            <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ТРЕНД · 15 ДНЕЙ</div>
            <Sparkline points={a.spark} width={300} height={40} color={t.accent} fill={`${t.accent}15`}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...txt.label, color: t.text4, marginTop: 4 }}>
              <span>140К</span><span>180К ₽</span>
            </div>
          </Card>
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ ...txt.label, color: t.text3 }}>ОПЕРАЦИИ</div>
            <button onClick={() => nav.go('history')} style={{ ...txt.label, color: t.accent, background: 'none', border: 'none', cursor: 'pointer' }}>ВСЕ →</button>
          </div>
          <Card t={t} pad={false}>
            {txs.map((x, i) => (
              <div key={x.id} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t}
                  leading={<IconTile t={t} size={30} square>{Icons[x.icon]({size:14})}</IconTile>}
                  title={x.title}
                  subtitle={`${x.cat} · ${fmtDate(x.date)} · ${fmtTime(x.date)}`}
                  trailingTop={<span style={{ color: x.amount > 0 ? t.pos : t.text }}>{fmtRub(x.amount, { sign: true })}</span>}
                />
              </div>
            ))}
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// CREDIT CARD (grace)
// ═══════════════════════════════════════════════════════════
function ScreenCreditCard({ t, nav, a, txs }) {
  const daysToGrace = daysUntil(a.graceDate);
  const totalGraceDays = 55;
  const usedDays = totalGraceDays - daysToGrace;
  const graceProgress = (usedDays / totalGraceDays) * 100;

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title={a.name} left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}/>
      <Scroll>
        <div style={{ padding: '18px 16px 8px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>ЗАДОЛЖЕННОСТЬ · ЛИМИТ {fmtRub(a.limit)}</div>
          <div style={{ ...dsp(t, 44), color: t.text, lineHeight: 1 }}>{fmtRub(Math.abs(a.balance))}</div>
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 6 }}>
            Доступно: <span style={{ color: t.text2 }}>{fmtRub(a.limit + a.balance)}</span>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <Card t={t}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ ...txt.label, color: t.accent }}>ГРЕЙС АКТИВЕН</div>
                <div style={{ ...dsp(t, 32), color: t.text, marginTop: 4, lineHeight: 1 }}>
                  {daysToGrace} <span style={{ fontSize: 14, color: t.text3, fontFamily: TYPE.mono }}>дн.</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...txt.label, color: t.text3 }}>ДО</div>
                <div style={{ ...txt.body, color: t.text, marginTop: 2 }}>{fmtDate(a.graceDate, { long: true })}</div>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ height: 6, background: t.surface3, borderRadius: t.radiusSm }}>
                <div style={{ width: `${graceProgress}%`, height: '100%', background: `linear-gradient(90deg, ${t.pos}, ${t.accent}, ${t.warn})`, borderRadius: t.radiusSm }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, ...txt.label, color: t.text4 }}>
                <span>{fmtDate(new Date(a.graceDate.getTime() - totalGraceDays*86400000))}</span>
                <span>{fmtDate(a.graceDate)}</span>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, background: t.accentDim, borderRadius: t.radiusSm, border: `0.5px solid ${t.accent}40` }}>
              <div style={{ ...txt.bodyS, color: t.text2, lineHeight: 1.45 }}>
                Нужно вернуть <span style={{ color: t.accent, fontWeight: 500 }}>{fmtRub(a.graceAmount)}</span> до {fmtDate(a.graceDate)}, иначе ставка 36,5% годовых.
              </div>
            </div>
          </Card>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Stat t={t} label="СТАВКА" value="36,5%" sub="на покупки"/>
            <Stat t={t} label="МИН. ПЛАТЁЖ" value={fmtRub(1200)} sub="1 числа"/>
            <Stat t={t} label="ИСПОЛЬЗ." value={`${Math.round(Math.abs(a.balance)/a.limit*100)}%`} sub="лимита"/>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ПОСЛЕДНИЕ ПОКУПКИ</div>
          <Card t={t} pad={false}>
            {txs.map((x, i) => (
              <div key={x.id} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t}
                  leading={<IconTile t={t} size={30} square>{Icons[x.icon]({size:14})}</IconTile>}
                  title={x.title}
                  subtitle={`${x.cat} · ${fmtDate(x.date)}`}
                  trailingTop={<span style={{ color: t.text }}>{fmtRub(x.amount, { sign: true })}</span>}
                />
              </div>
            ))}
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// LOAN — досрочка
// ═══════════════════════════════════════════════════════════
function ScreenLoan({ t, nav, a }) {
  const [extraPayment, setExtraPayment] = _useState(50_000);
  const monthlyRate = a.rate / 100 / 12;
  const principal = Math.abs(a.balance);
  const remainingTermBefore = a.termMonths - a.paidMonths;
  const principalAfter = Math.max(0, principal - extraPayment);
  const savedInterest = Math.round(extraPayment * monthlyRate * remainingTermBefore * 0.55);
  const savedMonths = Math.min(remainingTermBefore - 1, Math.round(extraPayment / a.monthlyPayment * 0.65));
  const progress = (a.paidMonths / a.termMonths) * 100;

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title={a.name} left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}/>
      <Scroll>
        <div style={{ padding: '18px 16px 6px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>ОСТАТОК · СТАВКА {fmtPct(a.rate)}</div>
          <div style={{ ...dsp(t, 44), color: t.text, lineHeight: 1 }}>{fmtRub(Math.abs(a.balance))}</div>
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 4 }}>из {fmtRub(a.originalAmount)}</div>
        </div>

        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...txt.label, color: t.text3, marginBottom: 6 }}>
            <span>{a.paidMonths} / {a.termMonths} МЕС.</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress t={t} value={progress} color={t.accent} height={3}/>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <Card t={t}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...txt.label, color: t.text3 }}>СЛЕДУЮЩИЙ ПЛАТЁЖ</div>
                <div style={{ ...txt.num, fontSize: 22, fontWeight: 500, color: t.text, marginTop: 4 }}>{fmtRub(a.monthlyPayment)}</div>
                <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{fmtDate(a.nextPayment, { long: true })} · через {daysUntil(a.nextPayment)} дн.</div>
              </div>
              <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.hairline2}`, borderRadius: t.radius }}>
                <Icons.Calendar size={22}/>
              </div>
            </div>
          </Card>
        </div>

        {/* EARLY REPAYMENT CALCULATOR */}
        <div style={{ padding: '0 16px 14px' }}>
          <Card t={t}>
            <div style={{ ...txt.label, color: t.accent, marginBottom: 8 }}>КАЛЬКУЛЯТОР ДОСРОЧКИ</div>
            <div style={{ ...dsp(t, 40), color: t.text, lineHeight: 1 }}>{fmtRub(extraPayment)}</div>
            <div style={{ margin: '14px 0 8px' }}>
              <input type="range" min={5000} max={200_000} step={5000} value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                style={{ width: '100%', accentColor: t.accent }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...txt.label, color: t.text4, marginTop: 2 }}>
                <span>5 000</span><span>200 000 ₽</span>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: 14, background: t.accentDim, border: `0.5px solid ${t.accent}40`, borderRadius: t.radiusSm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...txt.label, color: t.accent, marginBottom: 8 }}>
                <Icons.Sparkle size={12}/> ВЫ СЭКОНОМИТЕ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ ...txt.num, fontSize: 22, fontWeight: 500, color: t.text }}>{fmtRub(savedInterest)}</div>
                  <div style={{ ...txt.label, color: t.text3, marginTop: 2 }}>НА ПРОЦЕНТАХ</div>
                </div>
                <div>
                  <div style={{ ...txt.num, fontSize: 22, fontWeight: 500, color: t.text }}>{savedMonths} <span style={{ fontSize: 13, color: t.text3 }}>мес.</span></div>
                  <div style={{ ...txt.label, color: t.text3, marginTop: 2 }}>РАНЬШЕ СРОКА</div>
                </div>
              </div>
              <div style={{ marginTop: 10, ...txt.bodyS, color: t.text3 }}>
                Новый остаток: <span style={{ color: t.text, ...txt.num }}>{fmtRub(principalAfter)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>СТРУКТУРА ДОЛГА</div>
          <Card t={t}>
            <div style={{ display: 'flex', height: 6, borderRadius: t.radiusSm, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ flex: principal - a.totalInterestLeft, background: t.text2 }}/>
              <div style={{ flex: a.totalInterestLeft, background: t.warn }}/>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><div style={{ ...txt.label, color: t.text3 }}>ОСНОВНОЙ</div><div style={{ ...txt.num, fontSize: 14, color: t.text, marginTop: 2 }}>{fmtRub(principal - a.totalInterestLeft)}</div></div>
              <div><div style={{ ...txt.label, color: t.warn }}>ПРОЦЕНТЫ</div><div style={{ ...txt.num, fontSize: 14, color: t.text, marginTop: 2 }}>{fmtRub(a.totalInterestLeft)}</div></div>
            </div>
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// SAVINGS — tracking only (no topup/withdraw actions)
// ═══════════════════════════════════════════════════════════
function ScreenSavings({ t, nav, a }) {
  const pct = (a.balance / a.goal) * 100;
  const remaining = a.goal - a.balance;
  const monthlyAdd = 28_000;
  const monthsToGoal = Math.ceil(remaining / monthlyAdd);

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title={a.name} left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}/>
      <Scroll>
        <div style={{ padding: '18px 16px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>НА СЧЁТЕ · {fmtPct(a.rate)} ГОДОВЫХ</div>
          <div style={{ ...dsp(t, 44), color: t.text, lineHeight: 1 }}>{fmtRub(a.balance)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...txt.bodyS, color: t.pos, marginTop: 8 }}>
            <Icons.TrendingUp size={12}/> +{fmtRub(4_120)} процентов за апрель
          </div>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <Card t={t}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ ...txt.label, color: t.text3 }}>ЦЕЛЬ · {a.goalLabel.toUpperCase()}</div>
              <div style={{ ...txt.num, fontSize: 12, color: t.text2 }}>{pct.toFixed(0)}%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <div style={{ ...txt.num, fontSize: 26, fontWeight: 500, color: t.text, letterSpacing: '-0.02em' }}>{fmtRub(a.balance)}</div>
              <div style={{ ...txt.num, fontSize: 13, color: t.text4 }}> / {fmtRub(a.goal)}</div>
            </div>
            <Progress t={t} value={pct} color={t.accent} height={4}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...txt.label, color: t.text3, marginTop: 10 }}>
              <span>ОСТАЛОСЬ {fmtRub(remaining)}</span>
              <span>~{monthsToGoal} МЕС. ПРИ +{fmtRub(monthlyAdd)}/МЕС</span>
            </div>
          </Card>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>НАЧИСЛЕНИЯ ПРОЦЕНТОВ</div>
          <Card t={t} pad={false}>
            {[
              { m: 'Апрель 2026', a: 4_120 }, { m: 'Март 2026', a: 3_980 },
              { m: 'Февраль 2026', a: 3_745 }, { m: 'Январь 2026', a: 3_620 },
            ].map((x, i) => (
              <div key={i} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t}
                  leading={<IconTile t={t} size={28} square><Icons.TrendingUp size={12}/></IconTile>}
                  title={x.m} subtitle="Начисление процентов"
                  trailingTop={<span style={{ color: t.pos }}>{fmtRub(x.a, { sign: true })}</span>}/>
              </div>
            ))}
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════
function ScreenHistory({ t, nav }) {
  const [filter, setFilter] = _useState('all');
  const filtered = TXS.filter(x => filter === 'all' ? true : filter === 'out' ? x.amount < 0 : x.amount > 0);
  const groups = {};
  for (const x of filtered) {
    const key = fmtDate(x.date, { long: true });
    (groups[key] = groups[key] || []).push(x);
  }
  const total = filtered.reduce((s, x) => s + x.amount, 0);

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title="История"
        left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}
        right={<><IconBtn t={t}><Icons.Search size={18}/></IconBtn><IconBtn t={t}><Icons.Filter size={16}/></IconBtn></>}/>
      <Scroll>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 6 }}>ЗА АПРЕЛЬ · {filtered.length} ОПЕРАЦИЙ</div>
          <div style={{ ...dsp(t, 30), color: total < 0 ? t.text : t.pos, lineHeight: 1 }}>{fmtRub(total, { sign: true })}</div>
        </div>
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip t={t} active={filter==='all'} onClick={() => setFilter('all')}>Все</Chip>
          <Chip t={t} active={filter==='out'} onClick={() => setFilter('out')}>Расходы</Chip>
          <Chip t={t} active={filter==='in'}  onClick={() => setFilter('in')}>Доходы</Chip>
          <Chip t={t}>Категория</Chip>
          <Chip t={t}>Счёт</Chip>
        </div>
        {Object.entries(groups).map(([day, items]) => (
          <div key={day} style={{ padding: '6px 16px 6px' }}>
            <div style={{ ...txt.label, color: t.text3, padding: '6px 0' }}>{day.toUpperCase()}</div>
            <Card t={t} pad={false}>
              {items.map((x, i) => (
                <div key={x.id} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                  <Row t={t}
                    leading={<IconTile t={t} size={30} square>{Icons[x.icon]({size:14})}</IconTile>}
                    title={x.title} subtitle={`${x.cat} · ${fmtTime(x.date)}`}
                    trailingTop={<span style={{ color: x.amount > 0 ? t.pos : t.text }}>{fmtRub(x.amount, { sign: true })}</span>}/>
                </div>
              ))}
            </Card>
          </div>
        ))}
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// ADD TRANSACTION (was "Transfer") — manual entry to tracker
// ═══════════════════════════════════════════════════════════
function ScreenAddTx({ t, nav }) {
  const [amount, setAmount] = _useState('');
  const [kind, setKind] = _useState('expense');
  const [category, setCategory] = _useState('Продукты');
  const [account, setAccount] = _useState('debit');
  const [fromAcc, setFromAcc] = _useState('debit');
  const [toAcc,   setToAcc]   = _useState('savings');
  const cats = CATEGORIES.map(c => c.key);
  const incomeCats = ['Зарплата', 'Аванс', 'Перевод', 'Возврат'];
  const usedCats = kind === 'income' ? incomeCats : cats;

  const AccCarousel = ({ value, onChange, excludeId }) => (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 16px', margin: '0 -16px',
      scrollbarWidth: 'none' }}>
      {ACCOUNTS.filter(a => a.id !== excludeId).map(a => {
        const active = value === a.id;
        return (
          <div key={a.id} onClick={() => onChange(a.id)} style={{
            flexShrink: 0, width: 150, padding: '12px 14px', cursor: 'pointer',
            background: active ? t.accentDim : t.surface,
            border: `1px solid ${active ? t.accent : t.hairline}`,
            borderRadius: t.radius,
          }}>
            <div style={{ ...txt.label, color: t.text3, marginBottom: 4 }}>{a.kind}</div>
            <div style={{ ...txt.body, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
            <div style={{ ...txt.num, fontSize: 13, color: t.text2, marginTop: 4 }}>{fmtRub(a.balance)}</div>
            <div style={{ ...txt.label, color: t.text4, marginTop: 2 }}>{fmtCardMask(a.last4)}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title="Новая операция"
        left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}/>
      <Scroll>
        <div style={{ padding: '14px 16px' }}>
          <Segmented t={t} value={kind} onChange={setKind}
            options={[
              { value: 'expense', label: 'Расход' },
              { value: 'income',  label: 'Доход' },
              { value: 'transfer',label: 'Между счетами' },
            ]}/>
        </div>

        <div style={{ padding: '0 16px 18px' }}>
          <div style={{ padding: '30px 16px', textAlign: 'center',
            background: t.surface, border: `0.5px solid ${t.hairline}`, borderRadius: t.radius }}>
            <div style={{ ...dsp(t, 48), color: amount ? (kind === 'income' ? t.pos : t.text) : t.text4, lineHeight: 1 }}>
              {kind === 'expense' ? '−' : kind === 'income' ? '+' : ''}{amount || '0'} <span style={{ fontSize: 26, color: t.text3 }}>₽</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[100, 500, 1000, 5000, 10000].map(v => (
              <Chip t={t} key={v} onClick={() => setAmount(String(v))}>{fmtRub(v)}</Chip>
            ))}
          </div>
        </div>

        {kind !== 'transfer' && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>КАТЕГОРИЯ</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {usedCats.map(c => (
                <Chip t={t} key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
              ))}
            </div>
          </div>
        )}

        {kind === 'transfer' ? (
          <>
            <div style={{ padding: '0 0 12px' }}>
              <div style={{ ...txt.label, color: t.text3, marginBottom: 8, padding: '0 16px' }}>ОТКУДА</div>
              <AccCarousel value={fromAcc} onChange={setFromAcc} excludeId={toAcc}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 10px' }}>
              <div onClick={() => { const f = fromAcc; setFromAcc(toAcc); setToAcc(f); }}
                style={{ width: 36, height: 36, borderRadius: 999, background: t.surface2,
                  border: `0.5px solid ${t.hairline2}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: t.text2, cursor: 'pointer' }}>
                <Icons.Repeat size={16}/>
              </div>
            </div>
            <div style={{ padding: '0 0 14px' }}>
              <div style={{ ...txt.label, color: t.text3, marginBottom: 8, padding: '0 16px' }}>КУДА</div>
              <AccCarousel value={toAcc} onChange={setToAcc} excludeId={fromAcc}/>
            </div>
          </>
        ) : (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>СЧЁТ</div>
            <Card t={t} pad={false}>
              {ACCOUNTS.map((a, i) => (
                <div key={a.id} onClick={() => setAccount(a.id)} style={{
                  padding: '12px 14px', borderTop: i ? `0.5px solid ${t.hairline}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, border: `1.5px solid ${account === a.id ? t.accent : t.hairline2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {account === a.id && <div style={{ width: 8, height: 8, borderRadius: 4, background: t.accent }}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...txt.body, color: t.text }}>{a.name} <span style={{ ...txt.label, color: t.text4 }}>{fmtCardMask(a.last4)}</span></div>
                    <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{fmtRub(a.balance)}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        <div style={{ padding: '0 16px 14px' }}>
          <Button t={t} variant="primary" full size="lg" onClick={() => nav.go('dashboard')}>
            Добавить {amount ? fmtRub(Number(amount)) : ''}
          </Button>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════
function ScreenProfile({ t, nav }) {
  return (
    <ScreenFrame t={t}>
      <HeaderBar t={t} title="Профиль"
        left={<BackBtn t={t} onClick={() => nav.go('dashboard')}/>}/>
      <Scroll>
        <div style={{ padding: '18px 16px 22px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: t.accentDim, border: `0.5px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...txt.num, fontSize: 18, fontWeight: 500, color: t.accent }}>{USER.initials}</div>
          <div>
            <div style={{ ...dsp(t, 24), color: t.text, lineHeight: 1.1 }}>{USER.name}</div>
            <div style={{ ...txt.bodyS, color: t.text3, marginTop: 4 }}>{USER.phone}</div>
          </div>
        </div>

        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Stat t={t} label="СЧЕТОВ" value="4"/>
          <Stat t={t} label="ОПЕРАЦИЙ" value={String(TXS.length)} sub="за апрель"/>
          <Stat t={t} label="КАТЕГОРИЙ" value={String(CATEGORIES.length)}/>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ДАННЫЕ</div>
          <Card t={t} pad={false}>
            {[
              { i: 'List',       t: 'Категории расходов', s: `${CATEGORIES.length} категорий · лимиты` },
              { i: 'Calendar',   t: 'Регулярные платежи', s: '8 запланированных' },
              { i: 'Download',   t: 'Экспорт данных',     s: 'CSV · PDF' },
            ].map((x, i) => (
              <div key={i} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t}
                  leading={<IconTile t={t} size={30} square>{Icons[x.i]({size:14})}</IconTile>}
                  title={x.t} subtitle={x.s}
                  trailingTop={<Icons.ChevronRight size={14} style={{ color: t.text4 }}/>}/>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ПРИЛОЖЕНИЕ</div>
          <Card t={t} pad={false}>
            {[
              { i: 'Eye',      t: 'Скрыть балансы на главной', s: 'Выключено' },
              { i: 'Bell',     t: 'Уведомления',                s: 'Push + email · ежедневный отчёт' },
            ].map((x, i) => (
              <div key={i} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t}
                  leading={<IconTile t={t} size={30} square>{Icons[x.i]({size:14})}</IconTile>}
                  title={x.t} subtitle={x.s}
                  trailingTop={<Icons.ChevronRight size={14} style={{ color: t.text4 }}/>}/>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ ...txt.label, color: t.text3, marginBottom: 8 }}>ТЕМА ОФОРМЛЕНИЯ</div>
          <Card t={t} pad={false}>
            {['A','B','C'].map((k, i) => {
              const tt = TOKENS[k];
              const active = tt.name === t.name;
              return (
                <div key={k} onClick={() => nav.setTheme && nav.setTheme(k)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderTop: i ? `0.5px solid ${t.hairline}` : 'none', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 20, height: 32, background: tt.bg, border: `0.5px solid ${t.hairline}`, borderRadius: 4 }}/>
                    <div style={{ width: 20, height: 32, background: tt.surface2, borderRadius: 4 }}/>
                    <div style={{ width: 20, height: 32, background: tt.accent, borderRadius: 4 }}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...txt.body, color: t.text }}>{tt.name}</div>
                    <div style={{ ...txt.bodyS, color: t.text3, marginTop: 2 }}>{tt.tagline}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 10, border: `1.5px solid ${active ? t.accent : t.hairline2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <div style={{ width: 10, height: 10, borderRadius: 5, background: t.accent }}/>}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <div style={{ padding: '0 16px' }}>
          <Card t={t} pad={false}>
            {['Помощь','Выйти'].map((x, i) => (
              <div key={x} style={{ borderTop: i ? `0.5px solid ${t.hairline}` : 'none' }}>
                <Row t={t} title={<span style={{ color: x === 'Выйти' ? t.neg : t.text }}>{x}</span>}
                  trailingTop={<Icons.ChevronRight size={14} style={{ color: t.text4 }}/>}/>
              </div>
            ))}
          </Card>
        </div>
        <BottomPad/>
      </Scroll>
    </ScreenFrame>
  );
}

// ═══════════════════════════════════════════════════════════
// BOTTOM SHEET — quick expense entry (no bank flows)
// ═══════════════════════════════════════════════════════════
function BottomSheet({ t, kind, onClose, nav }) {
  const [amount, setAmount] = _useState('');
  const [category, setCategory] = _useState(kind === 'income' ? 'Зарплата' : 'Продукты');
  const cats = kind === 'income' ? ['Зарплата','Аванс','Перевод','Возврат'] : ['Продукты','Кафе','Транспорт','Покупки','Подписки','Здоровье'];
  const handleKey = (k) => {
    if (k === '⌫') setAmount(s => s.slice(0, -1));
    else if (k === '.') setAmount(s => s.includes('.') ? s : s + '.');
    else setAmount(s => (s + k).slice(0, 9));
  };
  if (!kind) return null;

  const title = kind === 'income' ? 'Записать доход' : 'Записать расход';
  const sign = kind === 'income' ? '+' : '−';
  const color = kind === 'income' ? t.pos : t.text;

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: t.surface, borderTopLeftRadius: t.radiusLg, borderTopRightRadius: t.radiusLg,
        borderTop: `0.5px solid ${t.hairline2}`, paddingBottom: 16,
        animation: 'sheetIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.text4 }}/>
        </div>
        <div style={{ padding: '10px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...txt.title, color: t.text }}>{title}</div>
          <IconBtn t={t} onClick={onClose}><Icons.Close size={18}/></IconBtn>
        </div>

        <div style={{ padding: '0 18px 12px', textAlign: 'center' }}>
          <div style={{ ...dsp(t, 44), color: amount ? color : t.text4, lineHeight: 1 }}>
            {sign}{amount || '0'} <span style={{ fontSize: 22, color: t.text3 }}>₽</span>
          </div>
          <div style={{ ...txt.bodyS, color: t.text3, marginTop: 8 }}>Основной {fmtCardMask('4821')}</div>
        </div>

        <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {cats.map(c => (
            <Chip t={t} key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>

        <NumberPad t={t} onKey={handleKey}/>

        <div style={{ padding: '12px 18px 0' }}>
          <Button t={t} variant="primary" full size="lg" onClick={onClose}>Сохранить</Button>
        </div>
      </div>
      <style>{`@keyframes sheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

Object.assign(window, {
  ScreenDashboard, ScreenCalendar, ScreenAccount, ScreenCreditCard, ScreenLoan,
  ScreenSavings, ScreenHistory, ScreenAddTx, ScreenProfile, BottomSheet,
});
