import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env.js';
import { checkDbConnection } from './config/db.js';
import { UPLOAD_ROOT_DIR } from './middleware/upload.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

import healthRoutes from './routes/health.routes.js';
import prescriptionRoutes from './routes/prescriptions.routes.js';
import aiAnalysisRoutes from './routes/aiAnalysis.routes.js';
import searchRoutes from './routes/search.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import prescriptionIntegrationRoutes from './routes/prescriptionIntegration.routes.js';
import patientRoutes from './routes/patients.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import labReportRoutes from './routes/labReports.routes.js';
import billingRoutes from './routes/billing.routes.js';

const app = express();

// ---------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving uploaded images cross-origin
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Basic rate limiting on the API surface (enterprise hardening)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve uploaded files (originals + preprocessed) statically
app.use('/uploads', express.static(UPLOAD_ROOT_DIR));

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------
app.use('/api/health', healthRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/prescriptions', aiAnalysisRoutes); // adds /:id/analyze and /:id/analysis
app.use('/api/prescriptions', prescriptionIntegrationRoutes); // adds /:id/link-patient, /dispense, /lab-reports, /invoice
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/patients', patientRoutes); // Patient Management + patient-scoped Lab/Billing/Timeline views
app.use('/api/pharmacy', pharmacyRoutes); // Pharmacy Integration
app.use('/api/lab-reports', labReportRoutes); // Lab Reports Integration
app.use('/api/invoices', billingRoutes); // Billing Integration

app.get('/', (req, res) => {
  res.json({ service: 'Medicare Pro API', version: '3.0.0-a (Part 3A: Core Enterprise Integration)' });
});

// 404 + centralized error handling — must be last
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function start() {
  try {
    await checkDbConnection();
  } catch (err) {
    logger.error('Could not connect to PostgreSQL on startup', { error: err.message });
    logger.warn('Server will still start — fix DB config and run `npm run migrate`.');
  }

  app.listen(env.port, () => {
    logger.info(`🚀 Medicare Pro API listening on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`   Uploads served from: ${path.relative(process.cwd(), UPLOAD_ROOT_DIR)}`);
  });
}

start();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});

export default app;
