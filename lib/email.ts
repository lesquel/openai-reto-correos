import "server-only";

import type { Assignment } from "./credits.ts";
import { encodeReward } from "./token.ts";

// Overridable only for local end-to-end tests against a mock server.
const BATCH_ENDPOINT = process.env.RESEND_BATCH_URL || "https://api.resend.com/emails/batch";
const BATCH_SIZE = 100;
const DEFAULT_SENDER = "OpenAI Event <no-reply@trillionquest.com>";
export const SUBJECT = "🧱 Tu premio se construye: arma tu QR de créditos de ChatGPT";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const firstName = (name: string) => name.split(/\s+/)[0] || name;
// The credit is never written in the email: it travels inside the game link and appears when the QR is complete.
export function renderHtml(name: string, link: string): string {
  const n = escapeHtml(firstName(name));
  return `<!doctype html><html><body style="margin:0;background:#E3EEFF;padding:32px 12px;font-family:'Plus Jakarta Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1F36">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border:3px solid #1A1F36;border-radius:22px">
<tr><td style="padding:36px 32px">
<p style="margin:0 0 20px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#D9480F;font-weight:800">OpenAI Event · Créditos de ChatGPT</p>
<h1 style="margin:0 0 14px;font-size:30px;line-height:34px;font-weight:800;letter-spacing:-.03em">${n}, los builders no reciben premios: <span style="color:#D9480F">los construyen.</span></h1>
<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#5B6384">Tus créditos de ChatGPT vienen dentro de un código QR partido en 16 bloques. Atrápalos todos con la caja, esquiva los bugs y, cuando el QR esté completo, reclama tus créditos.</p>
<a href="${escapeHtml(link)}" style="display:inline-block;background:#D9480F;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:18px;padding:15px 32px;border-radius:999px">Construir mi QR</a>
<p style="margin:28px 0 0;font-size:13px;line-height:20px;color:#5B6384">Suerte con los bugs. El enlace es personal y el código es de un solo uso: no lo compartas.</p>
<p style="margin:20px 0 0"><span style="display:inline-block;background:#1A1F36;color:#FFFFFF;border-radius:999px;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Built by <b style="font-size:15px;letter-spacing:-.02em;text-transform:none">ruray</b></span></p>
</td></tr></table></td></tr></table></body></html>`;
}

export function renderText(name: string, link: string): string {
  return `Hola, ${firstName(name)}:\n\nLos builders no reciben premios: los construyen. Tus créditos de ChatGPT vienen dentro de un código QR partido en 16 bloques. Atrápalos todos y reclama tus créditos:\n\n${link}\n\nSuerte con los bugs. El enlace es personal y el código es de un solo uso: no lo compartas.\n\nJuego: Built by Ruray\n`;
}

export type SendResult = { email: string; credit: string; status: "sent" | "failed"; error: string };

/** One email per assignment through Resend's batch API (100 per request). Reports the outcome per recipient. */
export async function sendCredits(assignments: Assignment[], siteUrl: string): Promise<SendResult[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");
  const from = process.env.EMAIL_SENDER || DEFAULT_SENDER;

  const results: SendResult[] = [];
  for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
    const chunk = assignments.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((a) => {
      const link = `${siteUrl}/reto#${encodeReward(a.credit, firstName(a.name))}`;
      return { from, to: [a.email], subject: SUBJECT, html: renderHtml(a.name, link), text: renderText(a.name, link) };
    });
    let error = "";
    try {
      const res = await fetch(BATCH_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) error = `Resend ${res.status}: ${(await res.text()).slice(0, 160)}`;
    } catch (err) {
      error = err instanceof Error ? err.message : "Error de red";
    }
    for (const a of chunk) results.push({ email: a.email, credit: a.credit, status: error ? "failed" : "sent", error });
  }
  return results;
}
