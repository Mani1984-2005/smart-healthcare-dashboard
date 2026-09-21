import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const auditLogPath = path.join(logDir, "audit.log");
const appLogPath = path.join(logDir, "app.log");

function writeLine(filePath, payload) {
  fs.appendFileSync(filePath, JSON.stringify(payload) + "\n");
}

function buildEvent(level, message, meta = {}) {
  return { level, message, service: "medicare-pro", version: "1.0.0", timestamp: new Date().toISOString(), ...meta };
}

export function logInfo(message, meta = {}) {
  const event = buildEvent("info", message, meta);
  writeLine(appLogPath, event);
  console.log(JSON.stringify(event));
}

export function logError(message, meta = {}) {
  const event = buildEvent("error", message, meta);
  writeLine(appLogPath, event);
  console.error(JSON.stringify(event));
}

export function logAuditEvent(event = {}) {
  const auditEvent = buildEvent("audit", "audit_event", event);
  writeLine(auditLogPath, auditEvent);
}

export function logCRUD({ entity, action, actor, before = null, after = null, requestId = "" }) {
  logAuditEvent({ entity, action, actor, before, after, requestId, timestamp: new Date().toISOString() });
}
