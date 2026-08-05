import sharp from 'sharp';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Preprocesses a prescription image to maximize OCR accuracy:
 *  - Normalizes orientation (EXIF-aware)
 *  - Converts to grayscale
 *  - Increases contrast / normalizes histogram
 *  - Sharpens edges of handwriting/print
 *  - Upscales small images (OCR engines perform better at higher DPI)
 *
 * Returns the path to the preprocessed image and its final dimensions.
 */
export async function preprocessImage(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${base}-preprocessed.png`);

  const image = sharp(inputPath).rotate(); // auto-orient via EXIF
  const metadata = await image.metadata();

  let pipeline = image.grayscale().normalize();

  // Upscale small scans for better OCR resolution (target ~1800px on the long edge)
  const longEdge = Math.max(metadata.width || 0, metadata.height || 0);
  if (longEdge > 0 && longEdge < 1800) {
    const scale = 1800 / longEdge;
    pipeline = pipeline.resize({
      width: Math.round((metadata.width || 0) * scale),
      height: Math.round((metadata.height || 0) * scale),
      fit: 'fill',
    });
  }

  pipeline = pipeline.sharpen().threshold(150, { grayscale: true });

  const info = await pipeline.png({ quality: 90 }).toFile(outputPath);

  logger.info('Image preprocessed for OCR', { outputPath, width: info.width, height: info.height });

  return {
    preprocessedPath: outputPath,
    width: info.width,
    height: info.height,
  };
}

export function isImageMimeType(mime) {
  return mime.startsWith('image/');
}
