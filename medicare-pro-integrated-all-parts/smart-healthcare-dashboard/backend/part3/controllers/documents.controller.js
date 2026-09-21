import { validateId, validateListQuery, validateOcrBody, validateTimelineQuery, validateUploadRequest } from "../validators/index.js";
import { withSafety } from "../services/safety.js";

export function createDocumentsController({ documents, ocr, config }) {
  const ctx = (req) => ({ actor: req.actor, requestId: req.requestId });
  return {
    async upload(req, res) {
      const input = validateUploadRequest(req, { maxBytes: config.maxUploadBytes });
      const result = await documents.ingest({ ...ctx(req), ...input });
      res.status(result.duplicate ? 200 : 201).json(result);
    },
    async ingestFixture(req, res) {
      const result = await documents.ingestFixture({ ...ctx(req), fixtureId: validateId(req.params.fixtureId, "fixtureId") });
      res.status(result.duplicate ? 200 : 201).json(result);
    },
    list(req, res) {
      res.json(documents.listDocuments(validateListQuery(req.query)));
    },
    get(req, res) {
      res.json(documents.getBundle({ ...ctx(req), documentId: validateId(req.params.id) }));
    },
    file(req, res) {
      const { doc, buffer } = documents.getFile({ ...ctx(req), documentId: validateId(req.params.id) });
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", 'inline; filename="document"');
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.send(buffer);
    },
    async runOcr(req, res) {
      const options = validateOcrBody(req.body, (await ocr.list()).map((p) => p.id));
      const result = await documents.runOcr({ ...ctx(req), documentId: validateId(req.params.id), ...options });
      res.json(withSafety(result));
    },
    async runExtraction(req, res) {
      res.json(withSafety(await documents.runExtraction({ ...ctx(req), documentId: validateId(req.params.id) })));
    },
    async addToTimeline(req, res) {
      res.json(withSafety(await documents.addToTimeline({ ...ctx(req), documentId: validateId(req.params.id) })));
    },
    timeline(req, res) {
      const query = validateTimelineQuery(req.query);
      res.json(documents.getTimeline({ ...ctx(req), patientId: validateId(req.params.patientId, "patientId"), ...query }));
    },
  };
}
