// backend/tests/prescriptionUploads.unit.test.js
// Unit tests for private storage guards, content sniffing, error
// sanitisation and serialization safety (no DB, no network).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);

const SECRET_TOKEN = 'unit-secret-token-do-not-leak';

// Must be set before config/env.js is first imported below.
process.env.PADDLEOCR_API_TOKEN = SECRET_TOKEN;
if (!process.env.PGPASSWORD) process.env.PGPASSWORD = 'fake-db-password';

const privateStorage = await import('../src/services/privateStorage.service.js');
const uploadsService = await import('../src/services/prescriptionUploads.service.js');
const { AppError } = await import('../src/utils/AppError.js');

describe('Private storage + content sniffing', () => {
  test('private storage root is outside the public uploads directory', async () => {
    const { UPLOAD_ROOT_DIR } = await import('../src/middleware/upload.js');
    const root = privateStorage.getPrivateStorageRoot();
    const rel = path.relative(UPLOAD_ROOT_DIR, root);
    const nested = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
    assert.equal(nested, false, 'private root must not live under public /uploads');
    assert.ok(fs.existsSync(root), 'private root must exist');
  });

  test('sniffFileContent detects real PNG bytes', async () => {
    const kind = await privateStorage.sniffFileContent(
      path.join(FIXTURES, 'synthetic_prescription.png')
    );
    assert.equal(kind, 'image/png');
  });

  test('sniffFileContent detects real JPEG bytes', async () => {
    const kind = await privateStorage.sniffFileContent(
      path.join(FIXTURES, 'synthetic_prescription.jpg')
    );
    assert.equal(kind, 'image/jpeg');
  });

  test('sniffFileContent detects real PDF bytes', async () => {
    const kind = await privateStorage.sniffFileContent(
      path.join(FIXTURES, 'sample_text_prescription.pdf')
    );
    assert.equal(kind, 'application/pdf');
  });

  test('sniffFileContent rejects plain text pretending to be an image', async () => {
    const tmp = path.join(os.tmpdir(), `sniff-${Date.now()}.png`);
    fs.writeFileSync(tmp, 'this is definitely not an image');
    try {
      const kind = await privateStorage.sniffFileContent(tmp);
      assert.equal(kind, null);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('hasPdfTrailer passes for the fixture PDF and fails for a PNG', async () => {
    assert.equal(
      await privateStorage.hasPdfTrailer(
        path.join(FIXTURES, 'sample_text_prescription.pdf')
      ),
      true
    );
    assert.equal(
      await privateStorage.hasPdfTrailer(
        path.join(FIXTURES, 'synthetic_prescription.png')
      ),
      false
    );
  });

  test('generateStoredFilename uses randomness, never client path parts', () => {
    const name = privateStorage.generateStoredFilename('../../etc/passwd.png');
    assert.match(name, /^\d+-[0-9a-f]{16}\.png$/);
    assert.ok(!name.includes('..'), 'generated name must not contain traversal');

    const noExt = privateStorage.generateStoredFilename('malware.exe');
    assert.ok(!noExt.endsWith('.exe'), 'disallowed extensions must be stripped');

    const noExt2 = privateStorage.generateStoredFilename(undefined);
    assert.match(noExt2, /^\d+-[0-9a-f]{16}$/);
  });

  test('resolvePrivatePath blocks every traversal attempt', () => {
    const ok = privateStorage.resolvePrivatePath('safe-name.png');
    assert.ok(ok.startsWith(privateStorage.getPrivateStorageRoot()));

    const attacks = [
      '../escape.png',
      '..\\escape.png',
      'sub/file.png',
      '/etc/passwd',
      'C:\\Windows\\System32\\cmd.exe',
      '',
      '.',
    ];
    for (const attack of attacks) {
      assert.throws(
        () => privateStorage.resolvePrivatePath(attack),
        (err) => err instanceof AppError && err.statusCode === 400,
        `expected rejection for ${JSON.stringify(attack)}`
      );
    }
  });
});

describe('Error sanitisation + serialization safety', () => {
  test('sanitizeErrorMessage redacts the OCR API token', () => {
    const msg = uploadsService.sanitizeErrorMessage(
      `upstream rejected key ${SECRET_TOKEN} for request`
    );
    assert.ok(!msg.includes(SECRET_TOKEN), 'token must never survive sanitisation');
    assert.ok(msg.includes('[redacted]'));
  });

  test('sanitizeErrorMessage collapses stack-like newlines and truncates', () => {
    const msg = uploadsService.sanitizeErrorMessage(
      'first line\n\tat Object.<anonymous> (/secret/path.js:1:1)\n' + 'x'.repeat(600)
    );
    assert.ok(!msg.includes('\n'), 'newlines must be collapsed');
    assert.ok(msg.length <= 485, 'message must be truncated');
  });

  test('serializeUpload never exposes filesystem paths', () => {
    const row = {
      id: '11111111-2222-3333-4444-555555555555',
      patient_id: null,
      doctor_id: null,
      original_filename: 'rx.png',
      stored_filename: '1700000000000-abcdefabcdef.png',
      file_path: 'E:\\MediCare-Pro\\backend\\private-prescription-uploads\\1700000000000-abcdefabcdef.png',
      file_size_bytes: 12345,
      mime_type: 'image/png',
      upload_source: 'image',
      checksum_sha256: 'a'.repeat(64),
      preprocessed_path: 'E:\\tmp\\pre.png',
      image_width: 800,
      image_height: 600,
      raw_ocr_text: 'PARACETAMOL 500MG',
      ocr_confidence: 91.5,
      ocr_duration_ms: 400,
      ocr_language: 'eng',
      ocr_engine: 'PaddleOCR',
      error_message: null,
      deleted_at: null,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    };

    const out = uploadsService.serializeUpload(row);
    const json = JSON.stringify(out);

    assert.ok(!('filePath' in out), 'file_path must not be serialized');
    assert.ok(!('storedFilename' in out), 'stored_filename must not be serialized');
    assert.ok(!('preprocessedPath' in out), 'preprocessed_path must not be serialized');
    assert.ok(!json.includes('private-prescription-uploads'), 'private dir must not leak');
    assert.ok(!json.includes('E:\\'), 'absolute paths must not leak');
    assert.ok(!json.includes('/uploads/'), 'no public static URL may be produced');
    assert.equal(out.documentUrl, '/api/prescription-uploads/11111111-2222-3333-4444-555555555555/document');
    assert.equal(out.ocrConfidence, 91.5);
    assert.equal(out.rawOcrText, 'PARACETAMOL 500MG');
  });
});
