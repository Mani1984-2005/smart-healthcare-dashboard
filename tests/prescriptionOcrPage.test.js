// tests/prescriptionOcrPage.test.js
// Frontend page + routing tests for the PaddleOCR prescription OCR feature.
// Source-inspection style (no DOM renderer available in this repo's test
// toolchain): verifies the route wiring, the mandatory safety warning, the
// machine-extracted labelling, upload constraints and that the page never
// fabricates auth, never creates clinical records, and only depends on
// packages that actually exist.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const appSource = read('src/App.jsx');
const pageSource = read('src/pages/PrescriptionOcrPage.jsx');
const apiSource = read('src/api/prescriptionUploads.js');

const MANDATORY_WARNING =
  'AI-extracted prescription information must be reviewed and verified by a qualified healthcare professional before clinical use.';

describe('Route wiring in App.jsx', () => {
  test('registers the /prescription-ocr route', () => {
    assert.match(appSource, /path="\/prescription-ocr"/);
  });

  test('lazy-imports the dedicated page component', () => {
    assert.match(
      appSource,
      /lazy\(\(\) => import\("\.\/pages\/PrescriptionOcrPage(\.jsx)?"\)\)/
    );
  });

  test('does not repoint the existing /prescriptions Pharmacy route', () => {
    assert.match(
      appSource,
      /path="\/prescriptions" element=\{<PharmacyPage[^>]*initialTab="dispensing"/
    );
  });
});

describe('PrescriptionOcrPage safety requirements', () => {
  test('renders the exact mandatory clinical-review warning', () => {
    assert.ok(
      pageSource.includes(MANDATORY_WARNING),
      'exact warning text must be present on the page'
    );
  });

  test('labels output as machine-extracted', () => {
    assert.match(pageSource, /machine-extracted/i);
    assert.match(pageSource, /AI OCR output/i);
  });

  test('never creates prescriptions or patient records from OCR output', () => {
    assert.ok(
      !/apiClient\.(post|patch|put)\(\s*[`'"]\/(prescriptions|patients)/i.test(pageSource),
      'page must not POST to clinical record endpoints'
    );
    assert.ok(
      !/createPrescription|createPatient|savePatient/i.test(pageSource),
      'page must not call clinical record creation helpers'
    );
  });

  test('no fabricated authentication or identity headers', () => {
    assert.ok(!/localStorage/i.test(pageSource), 'no localStorage identity spoofing');
    assert.ok(
      !/(["'`]Authorization["'`]\s*:)|Bearer\s+[A-Za-z0-9]/.test(pageSource),
      'no Authorization header fabrication'
    );
    assert.ok(!/Content-Type["'`]\s*:/.test(pageSource), 'no manual Content-Type');
  });

  test('does not claim upload progress reporting', () => {
    assert.ok(
      !/onUploadProgress|progress\s*%/i.test(pageSource),
      'fetch transport cannot report upload progress'
    );
  });

  test('never exposes a public /uploads URL for OCR documents', () => {
    assert.ok(
      !/["'`]\/uploads\//.test(pageSource),
      'documents must be fetched through the gated API route'
    );
    assert.match(pageSource, /prescriptionDocumentUrl/);
  });

  test('accepts only the supported document types and size cap', () => {
    assert.match(
      pageSource,
      /accept="image\/jpeg,image\/png,image\/webp,application\/pdf"/
    );
    assert.match(pageSource, /OCR_MAX_FILE_SIZE_MB/);
  });

  test('supports drag-and-drop natively without missing dependencies', () => {
    assert.match(pageSource, /onDrop=/);
    for (const forbidden of ['react-dropzone', 'framer-motion', 'DropzoneUpload']) {
      assert.ok(
        !pageSource.includes(forbidden),
        `page must not depend on ${forbidden}`
      );
    }
  });

  test('every import resolves to a file that exists in the repo', async () => {
    const importRe = /import\s+(?:[\w{}*,\s]+)\s+from\s+["']([^"']+)["']/g;
    let match;
    const missing = [];

    while ((match = importRe.exec(pageSource)) !== null) {
      const spec = match[1];
      if (!spec.startsWith('.')) continue; // package imports checked separately

      const base = path.join(ROOT, 'src', 'pages', spec);
      const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.png`];
      if (!candidates.some((c) => fs.existsSync(c))) missing.push(spec);
    }

    assert.deepEqual(missing, [], `missing local imports: ${missing.join(', ')}`);
  });

  test('lucide-react icons used are valid exports of the installed package', async () => {
    const { createRequire } = await import('node:module');
    const req = createRequire(path.join(ROOT, 'package.json'));
    let lucide;
    try {
      lucide = req('lucide-react');
    } catch {
      return; // package not installed in this environment — nothing to verify
    }

    const importRe = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
    let match;
    while ((match = importRe.exec(pageSource)) !== null) {
      for (const raw of match[1].split(',')) {
        const name = raw.trim();
        if (!name) continue;
        assert.ok(
          lucide[name] !== undefined,
          `lucide-react icon "${name}" is not exported by the installed package`
        );
      }
    }
  });
});

describe('API module surface', () => {
  test('exposes all documented functions', async () => {
    const mod = await import('../src/api/prescriptionUploads.js');
    for (const fn of [
      'validateUploadFile',
      'deriveUploadSource',
      'uploadPrescriptionOcr',
      'fetchPrescriptionUploads',
      'fetchPrescriptionUpload',
      'fetchPrescriptionUploadAudit',
      'deletePrescriptionUpload',
      'submitPrescriptionUploadReview',
      'prescriptionDocumentUrl',
    ]) {
      assert.equal(typeof mod[fn], 'function', `${fn} must be exported`);
    }
    assert.deepEqual(mod.OCR_UPLOAD_SOURCES, ['image', 'pdf', 'camera']);
  });

  test('API module keeps the documented hygiene rules', () => {
    assert.ok(!/localStorage/i.test(apiSource));
    assert.ok(!/(["'`]Authorization["'`]\s*:)/.test(apiSource));
  });
});
