import type { Currency } from "@/lib/render/types";

const LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat(LOCALE, { style: "currency", currency: "ARS", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
};

function formatCurrency(value: number | null, currency: Currency): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return CURRENCY_FORMATTERS[currency].format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "long",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Divide texto plano en párrafos, preservando saltos de línea del usuario. */
function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export { formatCurrency, formatDate, formatDateTime, toParagraphs, LOCALE, TIME_ZONE };
