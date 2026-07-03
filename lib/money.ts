import Decimal from "decimal.js";

export const KOPECKS_PER_RUBLE = 100;

export type Kopecks = number;

export function toKopecks(rubles: string | number | Decimal): Kopecks {
  return new Decimal(rubles)
    .times(KOPECKS_PER_RUBLE)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function fromKopecks(kopecks: Kopecks): Decimal {
  return new Decimal(kopecks).dividedBy(KOPECKS_PER_RUBLE);
}

const rublesFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const rublesSignedFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function formatRubles(
  kopecks: Kopecks,
  opts: { sign?: boolean } = {},
): string {
  const rubles = fromKopecks(kopecks).toNumber();
  return (opts.sign ? rublesSignedFormatter : rublesFormatter).format(rubles);
}
