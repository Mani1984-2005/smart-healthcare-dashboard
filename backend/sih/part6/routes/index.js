// Part 6 HTTP API. Mounted by the host at /part6 and /api/part6 (the Vite dev proxy strips /api).
// Every data route runs: authenticate -> requirePermission(<rbac permission>) -> service (object-level checks).
import express from "express";
import { requestContext, secureHeaders, rateLimit } from "../security/middleware.js";
import { toPublicError, Errors } from "../errors.js";
import { publicConfig } from "../config.js";
import { CONSENT_STATUS } from "../domain/constants.js";
import { DEMO_LABEL } from "../domain/constants.js";

const ID = /^[A-Za-z0-9][A-Za-z0-9\-.]{0,63}$/;
const RESOURCE_TYPE = /^[A-Z][A-Za-z]{2,40}$/;

function bodyObject(req) {
  const b = req.body;
  if (b === undefined) return {};
  if (b === null || typeof b !== "object" || Array.isArray(b)) throw Errors.validation("Request body must be a JSON object.");
  return b;
}
const idParam = (v, what = "id") => {
  if (typeof v !== "string" || !ID.test(v)) throw Errors.validation(`Invalid ${what}.`);
  return v;
};

export function createPart6Router(part6) {
  const { config, security, identity, fhir, consent, share, overview, settings, audit, source } = part6;
  const router = express.Router();

  router.use(requestContext);
  router.use(secureHeaders(config));
  router.use(rateLimit({ limiter: part6.limiter, audit, skip: (req) => req.path === "/auth/demo-login" }));
  const loginLimit = rateLimit({ limiter: part6.loginLimiter, audit });
  router.use(express.json({ limit: config.bodyLimit, strict: true }));

  /** authenticate + role permission. The authenticated user is placed on req.user. */
  const guard = (permission) => (req, _res, next) => {
    req.user = security.authenticate(req);
    if (permission) security.authorize(req.user, permission, req);
    next();
  };
  const authed = guard(null);

  // ---------- public ----------
  router.get("/meta", (_req, res) => {
    res.json({
      product: "MediCare Pro - Part 6: ABDM / FHIR / Consent / Security",
      label: DEMO_LABEL,
      mode: publicConfig(config),
      integration: {
        abdm: "ABDM-ready prototype. NOT connected to live ABDM. No ABHA verification is performed.",
        fhir: "FHIR R4-based interoperability prototype. Demo resources only. Not FHIR-certified.",
      },
    });
  });

  router.get("/auth/demo-users", (_req, res) => {
    if (!config.demoAuth) throw Errors.notFound("Resource");
    res.json({ label: "DEMO PERSONAS - prototype sign-in, not production authentication", users: security.demoUsers() });
  });

  router.post("/auth/demo-login", loginLimit, (req, res) => {
    if (!config.demoAuth) throw Errors.notFound("Resource");
    const { userId } = bodyObject(req);
    res.json(security.demoLogin(userId, req));
  });

  // ---------- session ----------
  router.get("/auth/me", authed, (req, res) => res.json({ user: security.publicUser(req.user) }));
  router.post("/auth/logout", authed, (req, res) => {
    security.logout(req.user, req);
    res.json({ ok: true });
  });

  router.get("/catalog", authed, (_req, res) => res.json(consent.catalog()));

  router.get("/overview", guard("overview.view"), (req, res) => res.json(overview.get(req.user)));

  // ---------- identity ----------
  router.get("/patients", guard("patients.list"), (req, res) => res.json({ label: "DEMO DATA", patients: identity.list(req.user) }));
  router.get("/patients/:id/identity", guard("identity.view"), (req, res) => {
    const result = identity.getIdentity(req.user, idParam(req.params.id, "patient id"), req);
    if (!result) throw Errors.notFound("Patient");
    res.json(result);
  });

  // ---------- FHIR ----------
  router.post("/fhir/generate", guard("fhir.generate"), (req, res) => {
    const b = bodyObject(req);
    res.json(fhir.generate(req.user, { patientId: idParam(b.patientId, "patientId"), resourceTypes: b.resourceTypes }, req));
  });
  router.get("/fhir/resources", guard("fhir.read"), (req, res) => {
    const { patientId, resourceType } = req.query;
    res.json({
      label: "FHIR DEMO RESOURCE",
      resources: fhir.listResources(req.user, {
        patientId: typeof patientId === "string" ? idParam(patientId, "patientId") : undefined,
        resourceType: typeof resourceType === "string" && RESOURCE_TYPE.test(resourceType) ? resourceType : undefined,
      }),
    });
  });
  router.get("/fhir/resources/:resourceType/:id", guard("fhir.read"), (req, res) => {
    if (!RESOURCE_TYPE.test(req.params.resourceType)) throw Errors.validation("Invalid resource type.");
    res.json(fhir.getResource(req.user, req.params.resourceType, idParam(req.params.id), req));
  });
  router.post("/fhir/bundle", guard("fhir.generate"), (req, res) => {
    const b = bodyObject(req);
    res.json(fhir.generateBundle(req.user, { patientId: idParam(b.patientId, "patientId"), resourceTypes: b.resourceTypes }, req));
  });
  router.get("/fhir/bundles", guard("fhir.read"), (req, res) => res.json({ label: "FHIR DEMO RESOURCE", bundles: fhir.listBundles(req.user) }));
  router.get("/fhir/bundles/:id", guard("fhir.read"), (req, res) => res.json(fhir.getBundle(req.user, idParam(req.params.id, "bundle id"), req)));
  router.post("/fhir/validate", guard("fhir.validate"), (req, res) => res.json(fhir.validate(req.user, bodyObject(req), req)));

  // ---------- consent ----------
  router.get("/consent", guard("consent.view"), (req, res) => {
    const { status, patientId } = req.query;
    if (status !== undefined && !Object.values(CONSENT_STATUS).includes(status)) throw Errors.validation("Invalid status filter.");
    res.json({ consents: consent.list(req.user, { status, patientId: typeof patientId === "string" ? idParam(patientId, "patientId") : undefined }) });
  });
  router.get("/consent/:id", guard("consent.view"), (req, res) => res.json(consent.get(req.user, idParam(req.params.id, "consent id"), req)));

  // Create: providers request (consent.request); patients share proactively (consent.patient_share).
  router.post("/consent", authed, (req, res) => {
    security.authorize(req.user, req.user.role === "PATIENT" ? "consent.patient_share" : "consent.request", req);
    res.status(201).json(consent.create(req.user, bodyObject(req), req));
  });
  router.post("/consent/:id/grant", guard("consent.decide"), (req, res) => res.json(consent.grant(req.user, idParam(req.params.id, "consent id"), bodyObject(req), req)));
  router.post("/consent/:id/deny", guard("consent.decide"), (req, res) => res.json(consent.deny(req.user, idParam(req.params.id, "consent id"), bodyObject(req), req)));
  router.post("/consent/:id/revoke", guard("consent.revoke"), (req, res) => res.json(consent.revoke(req.user, idParam(req.params.id, "consent id"), bodyObject(req), req)));

  // ---------- sharing ----------
  router.post("/share", guard("record.share"), (req, res) => res.json(share.execute(req.user, bodyObject(req), req)));
  router.get("/share", guard("share.view"), (req, res) => res.json({ shares: share.list(req.user) }));

  // ---------- audit & security ----------
  router.get("/audit", guard("audit.view"), (req, res) => {
    const q = req.query;
    const limit = Math.min(500, Math.max(1, Number.parseInt(q.limit ?? "200", 10) || 200));
    res.json(
      audit.query(req.user, {
        resolveCustodian: (pid) => source.getPatient(pid)?.custodianOrgId ?? null,
        filters: {
          limit,
          action: typeof q.action === "string" ? q.action : undefined,
          category: typeof q.category === "string" ? q.category : undefined,
          status: typeof q.status === "string" ? q.status : undefined,
          securityOnly: q.securityOnly === "true",
        },
      })
    );
  });
  router.get("/audit/verify", guard("audit.verify"), (_req, res) => res.json(audit.verifyChain()));

  router.get("/security/matrix", authed, (_req, res) => res.json(security.matrix()));
  router.get("/security/posture", guard("security.view"), (_req, res) => res.json(security.posture()));
  router.get("/security/events", guard("security.view"), (req, res) => {
    const { entries, total } = audit.query(req.user, {
      resolveCustodian: (pid) => source.getPatient(pid)?.custodianOrgId ?? null,
      filters: { securityOnly: true, limit: 100 },
    });
    const byAction = {};
    for (const e of entries) byAction[e.action] = (byAction[e.action] ?? 0) + 1;
    res.json({ total, byAction, events: entries });
  });

  // ---------- settings & demo controls ----------
  router.get("/settings", guard("security.view"), (_req, res) => res.json(settings.view()));
  router.put("/settings", guard("security.manage"), (req, res) => {
    settings.update(req.user, bodyObject(req), req);
    res.json(settings.view());
  });
  router.post("/demo/clock/advance", guard("security.manage"), (req, res) => res.json(settings.advanceClock(req.user, bodyObject(req).days, req)));
  router.post("/demo/reset", guard("security.manage"), (req, res) => res.json(settings.reset(req.user, req)));

  // ---------- fallthrough & errors ----------
  router.use((req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource was not found." }, requestId: req.part6?.requestId });
  });

  router.use((err, req, res, _next) => {
    const { status, body } = toPublicError(err, req.part6?.requestId);
    if (status >= 500) {
      // Server-side only; never returned to the client. Message only, no request bodies.
      console.error(`[part6] ${req.part6?.requestId} ${req.method} ${req.path}: ${err?.message}`);
    }
    if (res.headersSent) return;
    res.status(status).json(body);
  });

  return router;
}
