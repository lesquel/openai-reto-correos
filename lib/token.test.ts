import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeReward } from "./token.ts";

const decode = (data: string) => JSON.parse(Buffer.from(data, "base64url").toString("utf8"));

test("encodeReward produces unpadded base64url of {c, n} in UTF-8", () => {
  const data = encodeReward("CREDITOS-ABC-123", "Ángela");
  assert.doesNotMatch(data, /[=+/]/);
  assert.deepEqual(decode(data), { c: "CREDITOS-ABC-123", n: "Ángela" });
});

test("encodeReward matches reto-qr's enviar.py link_for byte for byte", () => {
  // python3 -c 'import base64,json;print(base64.urlsafe_b64encode(json.dumps({"c":"https://x.co/r?a=1&b=2","n":"José Ñu"},ensure_ascii=False,separators=(",",":")).encode()).decode().rstrip("="))'
  assert.equal(
    encodeReward("https://x.co/r?a=1&b=2", "José Ñu"),
    "eyJjIjoiaHR0cHM6Ly94LmNvL3I_YT0xJmI9MiIsIm4iOiJKb3PDqSDDkXUifQ",
  );
});

test("encodeReward omits n when the name is empty", () => {
  assert.deepEqual(decode(encodeReward("CODE-1", "  ")), { c: "CODE-1" });
});
