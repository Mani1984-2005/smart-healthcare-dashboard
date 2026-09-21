// Bundle assembly, consent-scope filtering (data minimisation) and integrity checksum.
import crypto from "node:crypto";
import { categoryOfResource, DEMO_TAG_SYSTEM } from "../domain/constants.js";

const SUPPORTING = new Set(["Patient", "Practitioner", "Organization"]);

export function buildBundle({ id, resources, now, baseUrl }) {
  return {
    resourceType: "Bundle",
    id,
    meta: {
      lastUpdated: now.toISOString(),
      tag: [{ system: DEMO_TAG_SYSTEM, code: "DEMO-DATA", display: "FHIR DEMO RESOURCE - synthetic data, prototype" }],
    },
    identifier: { system: `${baseUrl}/id/bundle`, value: id },
    type: "collection",
    timestamp: now.toISOString(),
    total: resources.length,
    entry: resources.map((resource) => ({ fullUrl: `${baseUrl}/${resource.resourceType}/${resource.id}`, resource })),
  };
}

const REF_RE = /^([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]+)$/;

function collectRefs(node, out) {
  if (Array.isArray(node)) return node.forEach((n) => collectRefs(n, out));
  if (node && typeof node === "object") {
    if (typeof node.reference === "string") {
      const m = REF_RE.exec(node.reference);
      if (m) out.add(node.reference);
    }
    Object.values(node).forEach((v) => collectRefs(v, out));
  }
}

/** Remove reference elements whose target is not in `keep`. Returns the pruned copy and what was removed. */
function stripDangling(node, keep, removed, path) {
  if (Array.isArray(node)) {
    const kept = [];
    node.forEach((item, i) => {
      if (item && typeof item === "object" && typeof item.reference === "string" && REF_RE.test(item.reference) && !keep.has(item.reference)) {
        removed.push({ path: `${path}[${i}]`, reference: item.reference });
        return;
      }
      kept.push(stripDangling(item, keep, removed, `${path}[${i}]`));
    });
    return kept;
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === "object" && !Array.isArray(v) && typeof v.reference === "string" && REF_RE.test(v.reference) && !keep.has(v.reference)) {
        removed.push({ path: `${path}.${k}`, reference: v.reference });
        continue;
      }
      const pruned = stripDangling(v, keep, removed, `${path}.${k}`);
      const empty = Array.isArray(pruned) ? pruned.length === 0 : pruned && typeof pruned === "object" && Object.keys(pruned).length === 0;
      if (!empty) out[k] = pruned;
    }
    return out;
  }
  return node;
}

/**
 * Minimum-necessary filter. Keeps the Patient (subject of every shared resource), the resources whose
 * consent category is allowed, and only those Practitioner/Organization resources still referenced.
 * References to anything that was filtered out are removed so the shared Bundle stays self-consistent
 * and does not leak the existence of out-of-scope records.
 */
export function scopeToCategories(resources, allowedCategories) {
  const allowed = new Set(allowedCategories);
  const primary = resources.filter((r) => !SUPPORTING.has(r.resourceType) && allowed.has(categoryOfResource(r)));
  const patient = resources.find((r) => r.resourceType === "Patient");

  const referenced = new Set();
  collectRefs(patient, referenced);
  collectRefs(primary, referenced);
  const supporting = resources.filter(
    (r) => (r.resourceType === "Practitioner" || r.resourceType === "Organization") && referenced.has(`${r.resourceType}/${r.id}`)
  );

  const included = [patient, ...supporting, ...primary].filter(Boolean);
  const keep = new Set(included.map((r) => `${r.resourceType}/${r.id}`));
  const removed = [];
  const pruned = included.map((r) => stripDangling(r, keep, removed, `${r.resourceType}/${r.id}`));
  return { resources: pruned, redactions: removed };
}

export function checksum(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function countByType(resources) {
  const counts = {};
  for (const r of resources) counts[r.resourceType] = (counts[r.resourceType] ?? 0) + 1;
  return counts;
}
