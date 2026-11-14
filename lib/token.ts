/** The game link carries only the attendee's first name; nothing secret lives in it. */
export function encodePlayer(name: string): string {
  return Buffer.from(JSON.stringify({ n: name.slice(0, 60) })).toString("base64url");
}

export function decodePlayer(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const { n } = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    return typeof n === "string" && n.trim() ? n.trim().slice(0, 60) : null;
  } catch {
    return null;
  }
}

/**
 * Reward link payload for the reto-qr game (public/reto): unpadded base64url of the UTF-8 JSON
 * {"c": code or link, "n": name}. Same bytes as reto-qr's enviar.py link_for. The code travels in
 * the link, so the game is the experience, not the protection: use single-use codes.
 */
export function encodeReward(code: string, name: string): string {
  const n = name.trim();
  return Buffer.from(JSON.stringify(n ? { c: code, n } : { c: code }), "utf8").toString("base64url");
}
