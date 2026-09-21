import crypto from "node:crypto";
import { AppError, notFound } from "../middleware/errors.js";
import { signSession } from "../services/sessionTokens.js";
import { validateSessionBody } from "../validators/index.js";
import { SYNTHETIC_PATIENTS } from "../seed/patients.js";
import { SAFETY } from "../services/safety.js";

export function createAdminController({ config, store, audit, ocr, fixtures }) {
  return {
    async health(_req, res) {
      res.json({
        status: "ok",
        module: "part3-medical-documents-ocr",
        standalone: true,
        syntheticDataOnly: true,
        authMode: config.auth.mode,
        storage: config.dataDir ? "file" : "memory",
        ocrProviders: await ocr.list(),
        fixtures: fixtures.list().length,
      });
    },

    createSession(req, res) {
      if (config.auth.mode !== "demo") throw notFound("NOT_FOUND", "Demo sessions are disabled.");
      const { role, name } = validateSessionBody(req.body);
      const now = Math.floor(Date.now() / 1000);
      const sub = `demo-${role.toLowerCase()}-${crypto.createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 6)}`;
      const exp = now + config.auth.sessionTtlSeconds;
      const token = signSession({ sub, role, name, iat: now, exp, mode: "demo" }, config.auth.secret);
      audit.record({ actor: { id: sub, role }, action: "SESSION_ISSUED", resourceType: "session", resourceId: sub, requestId: req.requestId, details: { mode: "demo" } });
      res.status(201).json({ token, expiresAt: new Date(exp * 1000).toISOString(), user: { id: sub, role, name }, mode: "demo", warning: "Demo session: the role is self-declared. This is not real authentication." });
    },

    me(req, res) {
      res.json({ user: req.actor, mode: config.auth.mode });
    },

    patients(_req, res) {
      const counts = store.countDocumentsByPatient();
      res.json({ items: SYNTHETIC_PATIENTS.map((p) => ({ ...p, documentCount: counts[p.id] ?? 0 })) });
    },

    fixtures(_req, res) {
      const items = fixtures.list().map((f) => {
        const doc = [...store.documents.values()].find((d) => d.fixtureId === f.id && d.patientId === f.patientId);
        // Only what the UI needs: no checksums, file names or transcript text.
        return {
          id: f.id, title: f.title, description: f.description, docType: f.docType, patientId: f.patientId, mimeType: f.mimeType,
          sizeBytes: f.sizeBytes, synthetic: true, ingestedDocumentId: doc?.id ?? null, ingestedStatus: doc?.status ?? null,
        };
      });
      res.json({ items, notice: "All documents are SYNTHETIC and made for software demonstration. They are not real patient records." });
    },

    fixtureFile(req, res) {
      const image = fixtures.getImage(req.params.fixtureId);
      if (!image) throw notFound("FIXTURE_NOT_FOUND", "Synthetic demo document not found.");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.fixtureId.replace(/[^A-Za-z0-9_-]/g, "_")}.png"`);
      res.send(image);
    },

    audit(req, res) {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? "100", 10) || 100, 1), 500);
      res.json({ items: audit.list({ documentId: req.query.documentId, patientId: req.query.patientId, limit }), safety: SAFETY });
    },

    reset(req, res) {
      if (!config.enableDemoReset) throw new AppError(403, "DEMO_RESET_DISABLED", "Demo reset is disabled in this environment.");
      store.resetAll();
      audit.record({ actor: req.actor, action: "DEMO_RESET", resourceType: "module", resourceId: "part3", requestId: req.requestId });
      res.json({ status: "reset", message: "All Part 3 documents, OCR results, extractions, timeline events and audit history were cleared. Synthetic demo documents remain available." });
    },
  };
}
