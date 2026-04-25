// data.jsx — realistic scenario for a middle-class Moscow user
// Салary ~180k, ипотечный платёж, кредитка с грейсом, кредит на ремонт,
// накопления. Суммы, ставки и даты — реалистичные (апрель 2026).

const TODAY = new Date(2026, 3, 24); // 24 апр 2026

const USER = {
  name: 'Алексей Перов',
  initials: 'АП',
  phone: '+7 925 ••• ••-42',
};

// ─── Счета ────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    id: 'debit',
    kind: 'Дебетовая',
    name: 'Основной',
    last4: '4821',
    balance: 147_820.55,
    currency: '₽',
    limit: null,
    spark: [140,138,152,148,160,155,172,168,175,180,178,172,166,158,147.8],
    color: '#b8ff5c',
  },
  {
    id: 'credit',
    kind: 'Кредитная',
    name: 'Platinum',
    last4: '0316',
    balance: -48_240, // задолженность
    currency: '₽',
    limit: 250_000,
    gracePaymentDue: 1_200,  // минималка вне грейса — здесь в грейсе
    graceAmount: 48_240,
    graceDate: new Date(2026, 4, 20), // 20 мая
    nextStmt: new Date(2026, 4, 1),
    spark: [0,-5,-12,-18,-15,-22,-28,-31,-36,-40,-42,-45,-47,-48,-48.24],
  },
  {
    id: 'savings',
    kind: 'Накопительный',
    name: 'Копилка',
    last4: '7742',
    balance: 312_400,
    currency: '₽',
    rate: 16.0,
    goal: 500_000,
    goalLabel: 'Резерв 3 мес',
    spark: [210,220,230,240,252,260,268,278,285,293,298,302,306,309,312.4],
  },
  {
    id: 'loan',
    kind: 'Потребительский',
    name: 'Ремонт',
    last4: '9903',
    balance: -384_720,
    currency: '₽',
    rate: 19.9,
    originalAmount: 500_000,
    monthlyPayment: 12_840,
    nextPayment: new Date(2026, 4, 15),
    termMonths: 48,
    paidMonths: 11,
    totalInterestLeft: 84_920,
  },
];

// ─── История операций ────────────────────────────────────────
const TXS = [
  { id: 1, date: new Date(2026,3,24,9,12), title: 'Кофемания',    cat: 'Кафе',     amount: -480,     icon: 'Coffee', acct: 'debit' },
  { id: 2, date: new Date(2026,3,24,8,2),  title: 'Метро',         cat: 'Транспорт',amount: -62,      icon: 'Car',    acct: 'debit' },
  { id: 3, date: new Date(2026,3,23,21,44),title: 'Перекрёсток',   cat: 'Продукты', amount: -3_284,   icon: 'ShoppingBag', acct: 'debit' },
  { id: 4, date: new Date(2026,3,23,14,20),title: 'Ozon',          cat: 'Покупки',  amount: -6_820,   icon: 'ShoppingBag', acct: 'credit' },
  { id: 5, date: new Date(2026,3,23,11,5), title: 'М. Петров',     cat: 'Перевод',  amount: +15_000,  icon: 'ArrowDownLeft', acct: 'debit' },
  { id: 6, date: new Date(2026,3,22,19,30),title: 'Яндекс GO',     cat: 'Транспорт',amount: -432,     icon: 'Car',    acct: 'debit' },
  { id: 7, date: new Date(2026,3,22,13,10),title: 'Wildberries',   cat: 'Покупки',  amount: -2_190,   icon: 'ShoppingBag', acct: 'credit' },
  { id: 8, date: new Date(2026,3,21,20,0), title: 'Вкусвилл',      cat: 'Продукты', amount: -1_840,   icon: 'ShoppingBag', acct: 'debit' },
  { id: 9, date: new Date(2026,3,21,8,15), title: 'Старбакс',      cat: 'Кафе',     amount: -390,     icon: 'Coffee', acct: 'debit' },
  { id: 10,date: new Date(2026,3,20,18,0), title: 'Азбука Вкуса',  cat: 'Продукты', amount: -4_210,   icon: 'ShoppingBag', acct: 'debit' },
  { id: 11,date: new Date(2026,3,20,12,0), title: 'ООО «Проект»',  cat: 'Зарплата', amount: +182_400, icon: 'Briefcase', acct: 'debit' },
  { id: 12,date: new Date(2026,3,19,22,0), title: 'Кинопоиск',     cat: 'Подписки', amount: -399,     icon: 'CreditCard', acct: 'credit' },
  { id: 13,date: new Date(2026,3,18,10,0), title: 'Аптека 36,6',   cat: 'Здоровье', amount: -1_120,   icon: 'Gift', acct: 'debit' },
  { id: 14,date: new Date(2026,3,17,14,0), title: 'Lamoda',        cat: 'Покупки',  amount: -8_990,   icon: 'ShoppingBag', acct: 'credit' },
];

// ─── Планируемые события (для календаря) ─────────────────────
const UPCOMING = [
  { date: new Date(2026,4,1),  kind: 'income',   title: 'Аванс',             amount: +80_000 },
  { date: new Date(2026,4,1),  kind: 'bill',     title: 'Интернет',           amount: -680 },
  { date: new Date(2026,4,5),  kind: 'bill',     title: 'ЖКХ',                amount: -8_450 },
  { date: new Date(2026,4,10), kind: 'bill',     title: 'Ипотека',            amount: -54_200 },
  { date: new Date(2026,4,15), kind: 'loan',     title: 'Платёж по кредиту',  amount: -12_840 },
  { date: new Date(2026,4,17), kind: 'bill',     title: 'Мобильная связь',    amount: -450 },
  { date: new Date(2026,4,20), kind: 'credit',   title: 'Погашение кредитки', amount: -48_240 },
  { date: new Date(2026,4,20), kind: 'income',   title: 'Зарплата',           amount: +102_400 },
  { date: new Date(2026,4,25), kind: 'sub',      title: 'Яндекс Плюс',        amount: -299 },
  { date: new Date(2026,4,28), kind: 'bill',     title: 'Страховка авто',     amount: -3_200 },
];

// ─── Прогноз баланса (daily, 30 дней вперёд) ──────────────────
function forecastBalance(start = 147_820, days = 30) {
  const arr = [];
  let bal = start;
  const now = new Date(TODAY);
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    // ежедневный drift: ~ -1800₽/день на бытовые траты
    bal -= 1400 + Math.random() * 900;
    for (const e of UPCOMING) {
      if (e.date.getDate() === d.getDate() && e.date.getMonth() === d.getMonth()) {
        bal += e.amount;
      }
    }
    arr.push({ date: d, balance: Math.round(bal) });
  }
  return arr;
}

// ─── Категории расходов (для аналитики) ──────────────────────
const CATEGORIES = [
  { key: 'Продукты',   spent: 24_840, limit: 35_000, color: '#b8ff5c' },
  { key: 'Кафе',       spent:  6_320, limit: 10_000, color: '#f3c176' },
  { key: 'Транспорт',  spent:  3_940, limit:  6_000, color: '#89b3ff' },
  { key: 'Покупки',    spent: 18_000, limit: 20_000, color: '#ef8578' },
  { key: 'Подписки',   spent:  1_420, limit:  2_000, color: '#c39aff' },
  { key: 'Здоровье',   spent:  2_180, limit:  5_000, color: '#7de0a0' },
];

// ─── Форматирование даты ─────────────────────────────────────
const MONTHS_RU = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const MONTHS_RU_FULL = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const DOW_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function fmtDate(d, { long = false } = {}) {
  if (!d) return '';
  return `${d.getDate()} ${long ? MONTHS_RU_FULL[d.getMonth()] : MONTHS_RU[d.getMonth()]}`;
}
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function daysUntil(d) {
  const ms = d - TODAY;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

Object.assign(window, {
  TODAY, USER, ACCOUNTS, TXS, UPCOMING, CATEGORIES,
  MONTHS_RU, MONTHS_RU_FULL, DOW_RU,
  forecastBalance, fmtDate, fmtTime, daysUntil,
});
