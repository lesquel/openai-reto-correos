import { normalizeHeader, parseCsv, type Attendee, type Table } from "./csv.ts";

export type Assignment = Attendee & { credit: string };
export type CreditStatus = "sent" | "failed" | "free";
export type ReportRow = { credit: string; status: CreditStatus; name: string; email: string; error: string };

const CREDIT_WORDS = ["credito", "creditos", "credit", "credits", "codigo", "code", "coupon", "cupon", "promo", "voucher", "link", "url", "enlace", "redemption", "canje", "token", "key", "clave"];
const EMAIL_RE = /@/;

/** Finds the column holding ChatGPT credit codes/links: by header first, then the most unique non-email column. */
export function detectCreditColumn({ headers, rows }: Table): number {
  const normalized = headers.map(normalizeHeader);
  const byHeader = normalized.findIndex((h) => CREDIT_WORDS.some((w) => ` ${h} `.includes(` ${w} `)));
  if (byHeader !== -1) return byHeader;
  if (headers.length === 1) return 0;
  let best = -1;
  let bestUnique = 0;
  headers.forEach((_, col) => {
    const values = rows.map((r) => (r[col] ?? "").trim()).filter(Boolean);
    if (values.some((v) => EMAIL_RE.test(v))) return;
    const unique = new Set(values).size;
    if (unique > bestUnique) { bestUnique = unique; best = col; }
  });
  return best;
}

export function buildCredits({ rows }: Table, col: number): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = (row[col] ?? "").trim();
    if (value) seen.add(value);
  }
  return [...seen];
}

/** One credit per attendee, in file order. Extra attendees or extra credits are reported, never dropped silently. */
export function assignCredits(attendees: Attendee[], credits: string[]) {
  const count = Math.min(attendees.length, credits.length);
  return {
    assignments: attendees.slice(0, count).map((a, i) => ({ ...a, credit: credits[i] })),
    usersWithoutCredit: attendees.slice(count),
    unusedCredits: credits.slice(count),
  };
}

const REPORT_HEADERS = ["credito", "estado", "nombre", "email", "error"];
const STATUS_LABEL: Record<CreditStatus, string> = { sent: "enviado", failed: "fallido", free: "libre" };
const LABEL_STATUS = Object.fromEntries(Object.entries(STATUS_LABEL).map(([k, v]) => [v, k])) as Record<string, CreditStatus>;

const cell = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (headers: string[], rows: string[][]) =>
  "﻿" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

/** Report = one row per credit with its status. Re-uploading it rebuilds the dashboard. */
export function toReportCsv(rows: ReportRow[]): string {
  return toCsv(REPORT_HEADERS, rows.map((r) => [r.credit, STATUS_LABEL[r.status], r.name, r.email, r.error]));
}

export function parseReport(text: string): ReportRow[] {
  const { headers, rows } = parseCsv(text);
  const idx = REPORT_HEADERS.map((h) => headers.map(normalizeHeader).indexOf(h));
  if (idx[0] === -1 || idx[1] === -1) throw new Error("Este CSV no es un reporte de créditos (faltan columnas credito/estado).");
  return rows.map((r) => {
    const get = (i: number) => (idx[i] === -1 ? "" : (r[idx[i]] ?? "").trim());
    return { credit: get(0), status: LABEL_STATUS[get(1).toLowerCase()] ?? "free", name: get(2), email: get(3), error: get(4) };
  });
}
