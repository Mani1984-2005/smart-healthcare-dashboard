// Loads the bundled SYNTHETIC demo documents (PNG + recorded transcript) and verifies their integrity.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeOcrText } from "../services/extraction/text.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = path.join(here, "fixtures");
export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export function loadFixtureCatalog({ dir = FIXTURE_DIR, logger = console } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const items = new Map();
  for (const m of manifest) {
    const image = fs.readFileSync(path.join(dir, m.imageFile));
    if (sha256(image) !== m.sha256) {
      logger.error(JSON.stringify({ level: "error", service: "part3", code: "FIXTURE_INTEGRITY", fixtureId: m.id, message: "Fixture image does not match its recorded checksum; fixture disabled." }));
      continue;
    }
    items.set(m.id, { ...m, image, transcript: normalizeOcrText(fs.readFileSync(path.join(dir, m.transcriptFile), "utf8")) });
  }
  const publicView = ({ image: _i, transcript: _t, ...rest }) => rest;
  return {
    list: () => [...items.values()].map(publicView),
    get: (id) => (items.has(id) ? publicView(items.get(id)) : null),
    getImage: (id) => items.get(id)?.image ?? null,
    getTranscript: (id) => items.get(id)?.transcript ?? null,
    findByHash: (hash) => {
      for (const it of items.values()) if (it.sha256 === hash) return publicView(it);
      return null;
    },
  };
}
