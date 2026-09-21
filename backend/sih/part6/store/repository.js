// Repository abstraction for the dedicated part6_* collections.
// Two implementations behind one interface: in-memory (tests) and atomic JSON file (demo persistence).
// A Postgres implementation can be dropped in later without touching any service (see ../schema.sql).
import fs from "node:fs";
import path from "node:path";

const clone = (v) => (v === undefined ? v : structuredClone(v));

export const COLLECTIONS = Object.freeze({
  users: "part6_users",
  organizations: "part6_organizations",
  patients: "part6_patients",
  identityLinks: "part6_identity_links",
  sourceRecords: "part6_source_records",
  fhirResources: "part6_fhir_resources",
  fhirBundles: "part6_fhir_bundles",
  consents: "part6_consents",
  dataShares: "part6_data_shares",
  auditLogs: "part6_audit_logs",
  settings: "part6_settings",
  validations: "part6_validations",
});

export function createRepository({ mode = "memory", filePath } = {}) {
  let db = load();
  let dirty = false;
  let scheduled = false;

  function load() {
    if (mode === "file" && filePath && fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (parsed && typeof parsed === "object") {
          return { collections: parsed.collections ?? {}, meta: parsed.meta ?? {} };
        }
      } catch {
        // A corrupt store must not brick the demo; start clean (it is reseeded).
      }
    }
    return { collections: {}, meta: {} };
  }

  function writeNow() {
    if (mode !== "file" || !filePath || !dirty) return;
    dirty = false;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, filePath); // atomic replace
  }

  function markDirty() {
    if (mode !== "file") return;
    dirty = true;
    if (!scheduled) {
      scheduled = true;
      setImmediate(() => {
        scheduled = false;
        writeNow();
      });
    }
  }

  const col = (name) => (db.collections[name] ??= {});

  return {
    mode,
    list: (name) => Object.values(col(name)).map(clone),
    get: (name, id) => clone(col(name)[id] ?? null),
    has: (name, id) => Object.hasOwn(col(name), id),
    count: (name) => Object.keys(col(name)).length,
    put(name, id, value) {
      col(name)[id] = clone(value);
      markDirty();
      return clone(value);
    },
    remove(name, id) {
      delete col(name)[id];
      markDirty();
    },
    getMeta: (key, fallback = null) => (Object.hasOwn(db.meta, key) ? clone(db.meta[key]) : fallback),
    setMeta(key, value) {
      db.meta[key] = clone(value);
      markDirty();
    },
    /** Monotonic per-name counter, used for human-readable ids (CONS-DEMO-001 ...). */
    nextSeq(name) {
      const key = `seq:${name}`;
      db.meta[key] = (db.meta[key] ?? 0) + 1;
      markDirty();
      return db.meta[key];
    },
    /** Wipe everything (used by demo reset and tests). */
    clearAll() {
      db = { collections: {}, meta: {} };
      markDirty();
    },
    flush() {
      dirty = mode === "file";
      writeNow();
    },
  };
}
