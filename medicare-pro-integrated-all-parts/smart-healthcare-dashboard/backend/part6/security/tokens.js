// Minimal HS256 signed session tokens (JWT-compatible format) using only node:crypto.
// This is DEMO session auth. Production would federate with the hospital IdP / ABDM sign-in (OIDC).
import crypto from "node:crypto";

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const ISS = "medicare-pro-part6";
const AUD = "part6-api";

function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createTokenService({ secret, ttlSeconds, now = () => new Date() }) {
  return {
    issue(userId) {
      const iat = Math.floor(now().getTime() / 1000);
      const payload = { iss: ISS, aud: AUD, sub: userId, iat, exp: iat + ttlSeconds, jti: crypto.randomUUID() };
      const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const body = b64(JSON.stringify(payload));
      return { token: `${head}.${body}.${sign(`${head}.${body}`, secret)}`, payload };
    },

    /** Returns the payload, or throws an Error whose message is a short internal reason (never shown to users). */
    verify(token) {
      if (typeof token !== "string" || token.length > 2048) throw new Error("malformed");
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("malformed");
      const [head, body, sig] = parts;
      const expected = sign(`${head}.${body}`, secret);
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("bad-signature");
      let header;
      let payload;
      try {
        header = JSON.parse(Buffer.from(head, "base64url").toString("utf8"));
        payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      } catch {
        throw new Error("malformed");
      }
      if (header.alg !== "HS256") throw new Error("bad-alg"); // blocks alg=none downgrade
      if (payload.iss !== ISS || payload.aud !== AUD) throw new Error("bad-claims");
      if (typeof payload.sub !== "string" || typeof payload.jti !== "string") throw new Error("bad-claims");
      if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error("expired");
      return payload;
    },
  };
}
