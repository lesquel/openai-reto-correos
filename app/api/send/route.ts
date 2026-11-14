import { timingSafeEqual } from "node:crypto";

import type { Assignment } from "@/lib/credits";
import { sendCredits } from "@/lib/email";

const MAX_RECIPIENTS = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordMatches(given: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const isAssignment = (a: unknown): a is Assignment => {
  const v = a as Partial<Assignment> | null;
  return typeof v?.email === "string" && EMAIL_RE.test(v.email) && typeof v.name === "string" && typeof v.credit === "string" && v.credit.trim() !== "";
};

export async function POST(request: Request) {
  let body: { password?: unknown; assignments?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!passwordMatches(body.password)) return Response.json({ error: "Contraseña incorrecta." }, { status: 401 });
  if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
    return Response.json({ error: "No hay destinatarios con crédito." }, { status: 400 });
  }
  if (body.assignments.length > MAX_RECIPIENTS) {
    return Response.json({ error: `Máximo ${MAX_RECIPIENTS} destinatarios por envío.` }, { status: 400 });
  }
  if (!body.assignments.every(isAssignment)) {
    return Response.json({ error: "Hay filas sin email válido o sin crédito." }, { status: 400 });
  }
  const assignments = body.assignments.map((a) => ({ name: a.name.slice(0, 120), email: a.email.toLowerCase(), credit: a.credit.trim().slice(0, 500) }));

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  try {
    return Response.json({ results: await sendCredits(assignments, siteUrl) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Error al enviar." }, { status: 500 });
  }
}
