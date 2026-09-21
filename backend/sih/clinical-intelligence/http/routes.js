// Part 4 — HTTP layer. Thin: validate → authorise → call service → respond. Role matrix:
//   DOCTOR : everything, including recording a clinician review
//   NURSE  : view + run analysis (cannot review)
//   ADMIN  : audit metadata only (no clinical content — minimum necessary)
//   others : no access
import express from "express";
import crypto from "node:crypto";
import { analyzeRequestSchema, reviewRequestSchema, sessionRequestSchema } from "../contracts/schemas.js";
import { errors, errorHandler, zodIssues } from "./errors.js";
import { requireRole } from "./auth.js";

const CLINICAL = ["DOCTOR", "NURSE"];
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export function buildRouter({ config, sessions, authenticate, service, reviews, allowRate }) {
  const router = express.Router();

  router.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(express.json({ limit: config.maxBodyBytes }));

  const parse = (schema, body) => {
    const r = schema.safeParse(body ?? {});
    if (!r.success) throw errors.validation(zodIssues(r.error));
    return r.data;
  };
  const rate = (req, _res, next) => (allowRate(req.actor?.id ?? req.ip) ? next() : next(errors.rateLimited()));

  // ---- public, non-sensitive ----
  router.get("/status", (_req, res) => res.json({ success: true, module: "clinical-intelligence", demoMode: config.demoMode, auth: config.authMode,
    ai: { provider: config.aiProvider === "anthropic" && !config.aiApiKey ? "none" : config.aiProvider }, disclaimer: "Decision support only. Clinician review required." }));

  router.post("/session", (req, res, next) => {
    try {
      if (config.authMode !== "demo") throw errors.notFound("Route");
      if (!allowRate(`session:${req.ip}`)) throw errors.rateLimited();
      const body = parse(sessionRequestSchema, req.body);
      res.status(201).json({ success: true, ...sessions.issue({ role: body.role, name: body.displayName, hospitalId: body.hospitalId }) });
    } catch (e) { next(e); }
  });

  // ---- authenticated ----
  router.get("/demo/patients", authenticate, requireRole(...CLINICAL), async (_req, res, next) => {
    try { res.json({ success: true, patients: await service.listPatients() }); } catch (e) { next(e); }
  });

  router.get("/patients/:patientId/context", authenticate, requireRole(...CLINICAL), async (req, res, next) => {
    try {
      if (!ID_RE.test(req.params.patientId)) throw errors.validation([{ path: "patientId", message: "invalid identifier" }]);
      res.json({ success: true, context: await service.contextFor(req.params.patientId, req.actor) });
    } catch (e) { next(e); }
  });

  router.get("/timeline/:patientId", authenticate, requireRole(...CLINICAL), async (req, res, next) => {
    try {
      if (!ID_RE.test(req.params.patientId)) throw errors.validation([{ path: "patientId", message: "invalid identifier" }]);
      res.json({ success: true, timeline: await service.timelineFor(req.params.patientId, req.actor) });
    } catch (e) { next(e); }
  });

  router.post("/analyze", authenticate, requireRole(...CLINICAL), rate, async (req, res, next) => {
    try {
      const body = parse(analyzeRequestSchema, req.body);
      const analysis = await service.analyze({ patientId: body.patientId, context: body.context, useAI: body.options?.useAI ?? false }, req.actor);
      res.status(201).json({ success: true, analysis: reviews.view(analysis) });
    } catch (e) { next(e); }
  });

  router.get("/analyses/:analysisId", authenticate, requireRole(...CLINICAL), (req, res, next) => {
    try {
      if (!UUID_RE.test(req.params.analysisId)) throw errors.notFound("Analysis");
      res.json({ success: true, analysis: reviews.get(req.params.analysisId, req.actor) });
    } catch (e) { next(e); }
  });

  router.post("/analyses/:analysisId/review", authenticate, requireRole("DOCTOR"), rate, (req, res, next) => {
    try {
      if (!UUID_RE.test(req.params.analysisId)) throw errors.notFound("Analysis");
      const body = parse(reviewRequestSchema, req.body);
      res.status(201).json({ success: true, analysis: reviews.submit({ analysisId: req.params.analysisId, ...body }, req.actor) });
    } catch (e) { next(e); }
  });

  router.get("/analyses/:analysisId/audit", authenticate, requireRole("DOCTOR", "ADMIN"), (req, res, next) => {
    try {
      if (!UUID_RE.test(req.params.analysisId)) throw errors.notFound("Analysis");
      res.json({ success: true, ...reviews.audit(req.params.analysisId, req.actor) });
    } catch (e) { next(e); }
  });

  router.use((_req, _res, next) => next(errors.notFound("Route")));
  router.use(errorHandler);
  return router;
}
