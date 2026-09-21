// Verifies the bytes really are what the Content-Type claims (magic numbers). Prevents mislabeled/hostile uploads.
export const ALLOWED_MIME = ["image/png", "image/jpeg", "application/pdf"];

export function sniffMime(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 1024).toString("latin1").includes("%PDF-")) return "application/pdf";
  return null;
}

/** Strip path components and anything outside a conservative character set. Used only for display; storage uses generated ids. */
export function sanitizeFilename(name) {
  const base = String(name ?? "").split(/[\\/]/).pop().replace(/[^A-Za-z0-9._ ()-]/g, "_").replace(/^\.+/, "").trim();
  return (base || "document").slice(0, 120);
}
