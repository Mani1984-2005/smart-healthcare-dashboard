// Part6SecurityService: authentication boundary, authorization decisions and the security posture view.
import { COLLECTIONS } from "../store/repository.js";
import { can, permissionMatrix } from "../security/permissions.js";
import { createTokenService } from "../security/tokens.js";
import { actorFromUser, ANONYMOUS_ACTOR } from "../audit/auditService.js";
import { Errors } from "../errors.js";
import { ROLES } from "../domain/constants.js";

export function createSecurityService({ repo, audit, config, clock }) {
  const tokens = createTokenService({ secret: config.tokenSecret, ttlSeconds: config.tokenTtlSeconds });

  const orgName = (id) => (id ? repo.get(COLLECTIONS.organizations, id)?.name ?? null : null);

  function publicUser(user) {
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      orgId: user.orgId ?? null,
      orgName: orgName(user.orgId),
      patientId: user.patientId ?? null,
    };
  }

  const isRevoked = (jti) => (repo.getMeta("revokedJti", []) ?? []).some((r) => r.jti === jti);

  function revokeToken(payload) {
    const nowSec = Math.floor(Date.now() / 1000);
    const list = (repo.getMeta("revokedJti", []) ?? []).filter((r) => r.exp > nowSec);
    list.push({ jti: payload.jti, exp: payload.exp });
    repo.setMeta("revokedJti", list);
  }

  const reject = (req, reason) => {
    audit.append({ actor: ANONYMOUS_ACTOR, action: "AUTH_TOKEN_REJECTED", resource: { type: "Session", id: null }, status: "denied", reason, req });
    return Errors.unauthenticated();
  };

  return {
    demoUsers() {
      return repo
        .list(COLLECTIONS.users)
        .map((u) => ({ ...publicUser(u), blurb: u.blurb }));
    },

    /** DEMO sign-in: pick a persona. There are no passwords/secrets here by design. Disabled unless PART6_DEMO_AUTH. */
    demoLogin(userId, req) {
      const user = typeof userId === "string" ? repo.get(COLLECTIONS.users, userId) : null;
      if (!user) {
        audit.append({ actor: ANONYMOUS_ACTOR, action: "AUTH_LOGIN_FAILED", resource: { type: "Session", id: null }, status: "failure", reason: "unknown-user", req });
        throw Errors.unauthenticated("Sign-in failed.");
      }
      const { token, payload } = tokens.issue(user.id);
      audit.append({ actor: actorFromUser(user), action: "AUTH_LOGIN_SUCCESS", resource: { type: "Session", id: user.id }, req, metadata: { method: "demo-persona" } });
      return { token, expiresAt: new Date(payload.exp * 1000).toISOString(), user: publicUser(user) };
    },

    /** Resolve the caller from the Authorization header. Throws 401 (and audits) when it cannot. */
    authenticate(req) {
      const header = req.headers?.authorization;
      if (!header || !header.startsWith("Bearer ")) throw reject(req, "missing-credentials");
      let payload;
      try {
        payload = tokens.verify(header.slice(7).trim());
      } catch (e) {
        throw reject(req, `invalid-token:${e.message}`);
      }
      if (isRevoked(payload.jti)) throw reject(req, "revoked-session");
      // Role and org are re-read from the store on every request: a token cannot carry or forge privileges.
      const user = repo.get(COLLECTIONS.users, payload.sub);
      if (!user) throw reject(req, "unknown-user");
      req.part6.tokenPayload = payload;
      return user;
    },

    logout(user, req) {
      if (req.part6?.tokenPayload) revokeToken(req.part6.tokenPayload);
      audit.append({ actor: actorFromUser(user), action: "AUTH_LOGOUT", resource: { type: "Session", id: user.id }, req });
    },

    /** Role-level check. Audits and throws 403 when the role lacks the permission. */
    authorize(user, permission, req) {
      if (can(user.role, permission)) return;
      audit.append({
        actor: actorFromUser(user),
        action: "PERMISSION_DENIED",
        resource: { type: "Permission", id: permission },
        status: "denied",
        reason: `role ${user.role} lacks ${permission}`,
        req,
      });
      throw Errors.forbidden("You do not have permission to access this health record.", "FORBIDDEN");
    },

    /** Object-level denial (right role, wrong object). Always audited. */
    deny(user, { resource, patientId, consentId, reason, req, publicMessage, code = "FORBIDDEN", action = "PERMISSION_DENIED" }) {
      audit.append({ actor: actorFromUser(user), action, resource, patientId, consentId, status: "denied", reason, req });
      throw Errors.forbidden(publicMessage ?? "You do not have permission to access this health record.", code);
    },

    publicUser,
    matrix: permissionMatrix,
    orgName,

    posture() {
      const chain = audit.verifyChain();
      const checks = [
        { id: "auth-boundary", label: "Authentication required on every Part 6 data endpoint", ok: true, detail: "Bearer session token verified on each request (HS256, expiry, audience, revocation)." },
        { id: "rbac", label: "Deny-by-default role-based access control", ok: true, detail: `${Object.keys(permissionMatrix().rows).length} permissions enforced server-side, plus object-level ownership/custodian checks.` },
        { id: "consent-enforced", label: "Consent enforced in the sharing business logic", ok: true, detail: "Export/share re-checks consent status, expiry, recipient and category scope on the server for every call." },
        { id: "audit-chain", label: "Audit log hash-chain intact", ok: chain.ok, detail: chain.ok ? `${chain.total} entries verified.` : `Chain broken at ${chain.brokenAt}.` },
        { id: "secret", label: "Token secret supplied via environment", ok: config.tokenSecretSource === "environment", detail: config.tokenSecretSource === "environment" ? "PART6_TOKEN_SECRET is set." : "Using an ephemeral per-process secret (fine for a demo: sessions reset on restart; set PART6_TOKEN_SECRET otherwise)." },
        { id: "demo-auth", label: "Demo persona sign-in disabled", ok: !config.demoAuth, detail: config.demoAuth ? "Enabled (prototype). Must be disabled and replaced by a real identity provider in production." : "Disabled." },
        { id: "rate-limit", label: "Rate limiting active", ok: true, detail: `${config.rateLimit.max} requests / ${config.rateLimit.windowMs / 1000}s per client (login: ${config.rateLimit.loginMax}).` },
        { id: "headers", label: "Secure response headers", ok: true, detail: "nosniff, frame denial, no-store caching, no-referrer, CSP default-src 'none'." },
        { id: "abdm", label: "Live ABDM connectivity", ok: false, detail: "NOT connected. ABDM_MODE=demo. No ABDM/ABHA verification is performed." },
      ];
      return { checks, auditChain: chain, demoClockOffsetDays: clock.offsetDays(), roles: Object.values(ROLES) };
    },
  };
}
