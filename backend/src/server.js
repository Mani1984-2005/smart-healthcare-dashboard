import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env.js';
import { authEnv, validateAuthConfig } from './config/authEnv.js';
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
import rbacRoutes from './routes/rbac.routes.js';
import scannerRoutes from './routes/scanner.routes.js';
import biometricRoutes from './routes/biometric.routes.js';
import clinicalAssistantRoutes from './routes/clinicalAssistant.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import versioningRoutes from './routes/versioning.routes.js';
// SECURITY (Phase 5): the mount below (app.use('/api/files', fileRoutes))
// references this binding — it must be imported or the whole app fails to
// evaluate with a ReferenceError before start() ever runs.
import fileRoutes from './routes/files.routes.js';
import { bootstrapWorkflow } from './workflowBootstrap.js';

const app = express();

// ---------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving uploaded images cross-origin
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// ACCESS LOGS (Phase 2F / task C): morgan's built-in 'combined' and 'dev'
// formats log the FULL URL, query string included. GET /api/search?q=<term>
// embeds search terms — often patient names — and id-carrying query params,
// which do not belong in access logs. The custom :request-path token below
// logs the path only; the rest of each format is unchanged in spirit.
morgan.token('request-path', (req) => (req.originalUrl || '').split('?')[0]);
app.use(morgan(
  env.isProd
    ? ':remote-addr - :remote-user [:date[clf]] ":request-path :http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ':method :request-path :status :response-time ms',
));

// Basic rate limiting on the API surface (enterprise hardening)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// SECURITY (Phase 5): uploaded prescription scans (PHI) are NO LONGER served
// by a public static /uploads mount. They are only reachable through the
// authenticated, permission-checked, ownership-scoped /api/files routes
// (routes/files.routes.js), whose responses keep the hardened headers
// (nosniff, sandbox CSP, no-store). Old /uploads URLs now 404.
app.use('/api/files', fileRoutes);

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------
app.use('/api/health', healthRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/prescriptions', aiAnalysisRoutes);
app.use('/api/prescriptions', prescriptionIntegrationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/invoices', billingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/auth', rbacRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/clinical-assistant', clinicalAssistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/versions', versioningRoutes);

// Bootstrap enterprise approval handlers
bootstrapWorkflow();

app.get('/', (req, res) => {
  res.json({ service: 'Medicare Pro API', version: '3.0.0 (Enterprise Suite)' });
});

// 404 + centralized error handling — must be last
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function start() {
  try {
    validateAuthConfig();
  } catch (err) {
    logger.error('Startup security validation failed', { error: err.message });
    process.exit(1);
  }

  const dbOk = await checkDbConnection();
  if (!dbOk) {
    logger.error('PostgreSQL is NOT reachable. The API will still start, but every database-backed request will fail with a real error (no fabricated data is ever returned).');
    logger.warn('Fix by setting PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE, then run `npm run migrate`.');
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
