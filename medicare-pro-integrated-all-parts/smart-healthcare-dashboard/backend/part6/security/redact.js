// Keep secrets and health data out of logs. Audit metadata is an allow-list of small primitives.
const SENSITIVE_KEY = /token|secret|password|passwd|authorization|api[-_]?key|private|credential|otp|cookie|session/i;

export function sanitizeMetadata(input, depth = 0) {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return input.length > 200 ? `${input.slice(0, 197)}...` : input;
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (depth >= 2) return undefined;
  if (Array.isArray(input)) {
    return input.slice(0, 25).map((v) => sanitizeMetadata(v, depth + 1)).filter((v) => v !== undefined);
  }
  if (typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEY.test(k)) continue;
      const clean = sanitizeMetadata(v, depth + 1);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  return undefined;
}

/** Drop the last IPv4 octet / most of an IPv6 address: enough for forensics, not for tracking a person. */
export function maskIp(ip) {
  if (!ip || typeof ip !== "string") return null;
  const v4 = ip.replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, ".x");
  if (ip.includes(":")) return `${ip.split(":").slice(0, 3).join(":")}::x`;
  return null;
}
