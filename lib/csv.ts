export type Attendee = { name: string; email: string };
export type Table = { headers: string[]; rows: string[][] };
/** `name` holds one column (full name) or several (first + last), joined with a space. */
export type ColumnMapping = { email: number; name: number[] };
export type BuildResult = { attendees: Attendee[]; invalid: number[]; duplicates: number };

const EMAIL_RE = /[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+/;

/** Lowercase, strip accents and punctuation: "Correo Electrónico:" -> "correo electronico". */
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const hasWord = (header: string, words: string[]) => {
  const padded = ` ${header} `;
  return words.some((w) => padded.includes(` ${w} `));
};

const EMAIL_WORDS = ["email", "e mail", "mail", "correo", "correos", "gmail"];
const FULL_NAME_WORDS = ["nombre completo", "nombres completos", "full name", "nombre y apellido", "nombres y apellidos", "name", "nombre", "participante", "asistente", "attendee", "estudiante", "inscrito"];
const FIRST_NAME_WORDS = ["first name", "firstname", "first", "nombres", "primer nombre", "given name"];
const LAST_NAME_WORDS = ["last name", "lastname", "last", "apellido", "apellidos", "surname", "family name"];
const NOT_A_PERSON = ["equipo", "team", "empresa", "company", "universidad", "university", "institucion", "evento", "event", "usuario", "user", "username", "proyecto", "project", "ciudad", "pais", "carrera"];

function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parses CSV text, auto-detecting comma, semicolon or tab as delimiter. */
export function parseCsv(raw: string): Table {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (d: string) => firstLine.split(d).length - 1;
  const delimiter = [",", ";", "\t"].reduce((best, d) => (count(d) > count(best) ? d : best), ",");
  const [headers = [], ...rows] = splitRows(text, delimiter);
  return { headers: headers.map((h) => h.trim()), rows };
}

const extractEmail = (cell: string | undefined) => (cell ?? "").match(EMAIL_RE)?.[0].toLowerCase() ?? null;

/** Guesses which columns hold the email and the person's name, from headers first and cell content second. */
export function detectColumns({ headers, rows }: Table): ColumnMapping {
  const sample = rows.slice(0, 50);
  const normalized = headers.map(normalizeHeader);

  const emailRatio = (col: number) =>
    sample.length ? sample.filter((r) => extractEmail(r[col])).length / sample.length : 0;
  let email = -1;
  let bestEmail = 0;
  normalized.forEach((h, col) => {
    const score = emailRatio(col) * 10 + (hasWord(h, EMAIL_WORDS) ? 5 : 0);
    const plausible = emailRatio(col) >= 0.5 || (sample.length === 0 && hasWord(h, EMAIL_WORDS));
    if (plausible && score > bestEmail) { bestEmail = score; email = col; }
  });

  const candidates = normalized
    .map((h, col) => ({ h, col }))
    .filter(({ h, col }) => col !== email && !hasWord(h, NOT_A_PERSON) && !hasWord(h, EMAIL_WORDS));

  const full = candidates
    .map(({ h, col }) => ({ col, rank: FULL_NAME_WORDS.findIndex((w) => hasWord(h, [w])) }))
    .filter((c) => c.rank !== -1 && !hasWord(normalized[c.col], LAST_NAME_WORDS) && !hasWord(normalized[c.col], FIRST_NAME_WORDS.filter((w) => w !== "nombres")))
    .sort((a, b) => a.rank - b.rank)[0];
  const first = candidates.find(({ h }) => hasWord(h, FIRST_NAME_WORDS));
  const last = candidates.find(({ h }) => hasWord(h, LAST_NAME_WORDS));

  let name: number[] = [];
  if (first && last) name = [first.col, last.col];
  else if (full) name = [full.col];
  else if (first) name = [first.col];
  return { email, name };
}

/** Applies a mapping: extracts emails, joins name columns, drops duplicates, reports invalid rows (1-based). */
export function buildAttendees({ rows }: Table, mapping: ColumnMapping): BuildResult {
  const seen = new Set<string>();
  const result: BuildResult = { attendees: [], invalid: [], duplicates: 0 };
  rows.forEach((row, index) => {
    const email = extractEmail(row[mapping.email]);
    if (!email) { result.invalid.push(index + 1); return; }
    if (seen.has(email)) { result.duplicates++; return; }
    seen.add(email);
    const name = mapping.name.map((c) => (row[c] ?? "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
    result.attendees.push({ name: name || email.split("@")[0], email });
  });
  return result;
}
