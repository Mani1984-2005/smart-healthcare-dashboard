export type QrRecordType = "PATIENT" | "DOCTOR" | "APPOINTMENT" | "INVOICE" | "LAB" | "PRESCRIPTION" | "CONTACT";

/**
 * QR codes in this app encode a short opaque reference token — not a URL, and
 * never any patient data itself — so scanning one only works from inside the
 * authenticated app, which looks the ID up in the real store. This avoids
 * embedding sensitive information in a scannable code or a URL.
 */
export function encodeQrReference(type: QrRecordType, id: string) {
  return `MCP:${type}:${id}`;
}

export function decodeQrReference(value: string): { type: QrRecordType; id: string } | null {
  const match = value.trim().match(/^MCP:([A-Z]+):(.+)$/);
  if (!match) return null;
  const [, type, id] = match;
  const validTypes: QrRecordType[] = ["PATIENT", "DOCTOR", "APPOINTMENT", "INVOICE", "LAB", "PRESCRIPTION", "CONTACT"];
  if (!validTypes.includes(type as QrRecordType)) return null;
  return { type: type as QrRecordType, id };
}
