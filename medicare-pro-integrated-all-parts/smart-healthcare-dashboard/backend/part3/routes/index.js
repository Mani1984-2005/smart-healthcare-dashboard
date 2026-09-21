// Part 3 — router assembly. Everything is created inside this module; nothing is imported from other parts of MediCare Pro.
import express from "express";
import { loadConfig } from "../config/config.js";
import { Part3Store } from "../models/store.js";
import { loadFixtureCatalog } from "../seed/fixtureCatalog.js";
import { createOcrRegistry } from "../services/ocr/registry.js";
import { createAuditService } from "../services/auditService.js";
import { createDocumentService } from "../services/documentService.js";
import { createAuth } from "../middleware/auth.js";
import { requestContext, securityHeaders } from "../middleware/context.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "../middleware/errors.js";
import { ALLOWED_MIME } from "../services/fileSniffer.js";
import { createDocumentsController } from "../controllers/documents.controller.js";
import { createAdminController } from "../controllers/admin.controller.js";

export function createPart3Context({ config = loadConfig(), ocrProviders = [], logger = console } = {}) {
  const store = new Part3Store({ dataDir: config.dataDir, logger });
  const fixtures = loadFixtureCatalog({ logger });
  const ocr = createOcrRegistry({ config, fixtures, extraProviders: ocrProviders });
  const audit = createAuditService(store, logger);
  const documents = createDocumentService({ store, ocr, fixtures, config, audit, logger });
  return { config, store, fixtures, ocr, audit, documents, logger };
}

export function createPart3Router(options = {}) {
  const context = createPart3Context(options);
  const { config, store, fixtures, ocr, audit, documents, logger } = context;
  const auth = createAuth({ config, audit });
  const admin = createAdminController({ config, store, audit, ocr, fixtures });
  const docs = createDocumentsController({ documents, ocr, config });
  const limit = (bucket, max) => createRateLimiter({ windowMs: config.rateLimit.windowMs, max, bucket });
  const json = express.json({ limit: "16kb" });
  const rawUpload = express.raw({ type: ALLOWED_MIME, limit: config.maxUploadBytes });

  const router = express.Router();
  router.use(requestContext, securityHeaders);

  // Public
  router.get("/health", admin.health);
  router.post("/auth/demo-session", limit("session", config.rateLimit.sessionMax), json, admin.createSession);

  // Everything below requires a valid session and an explicit permission.
  router.use(auth.authenticate);
  router.get("/me", admin.me);
  router.get("/patients", auth.authorize("documents:read"), admin.patients);

  router.get("/demo/fixtures", auth.authorize("documents:read"), admin.fixtures);
  router.get("/demo/fixtures/:fixtureId/file", auth.authorize("documents:read"), admin.fixtureFile);
  router.post("/demo/fixtures/:fixtureId/ingest", auth.authorize("documents:upload"), limit("upload", config.rateLimit.uploadMax), docs.ingestFixture);

  router.post("/documents", auth.authorize("documents:upload"), limit("upload", config.rateLimit.uploadMax), rawUpload, docs.upload);
  router.get("/documents", auth.authorize("documents:read"), docs.list);
  router.get("/documents/:id", auth.authorize("documents:read"), docs.get);
  router.get("/documents/:id/file", auth.authorize("documents:read"), docs.file);
  router.post("/documents/:id/ocr", auth.authorize("documents:process"), limit("process", config.rateLimit.processMax), json, docs.runOcr);
  router.post("/documents/:id/extract", auth.authorize("documents:process"), limit("process", config.rateLimit.processMax), docs.runExtraction);
  router.post("/documents/:id/timeline", auth.authorize("timeline:write"), limit("process", config.rateLimit.processMax), docs.addToTimeline);
  router.get("/patients/:patientId/timeline", auth.authorize("timeline:read"), docs.timeline);

  router.get("/audit", auth.authorize("audit:read"), admin.audit);
  router.post("/demo/reset", auth.authorize("demo:reset"), admin.reset);

  router.use(notFoundHandler);
  router.use(errorHandler(logger));
  return { router, context };
}
