import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import updateRouter from './routes/update.js';
import domainsRouter from './routes/domains.js';
import adminRouter from './routes/admin.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({
  origin: config.APP_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Global API rate limiter — configurable via admin console
let cachedGlobalLimit = 120; // default: 120 req/min per IP
let limitCacheTime = 0;
async function getGlobalLimit(): Promise<number> {
  if (Date.now() - limitCacheTime < 30_000) return cachedGlobalLimit;
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key='global_api_rate_limit'");
    if (r.rows.length) cachedGlobalLimit = Math.max(10, Number(r.rows[0].value) || 120);
    limitCacheTime = Date.now();
  } catch { /* use cached value */ }
  return cachedGlobalLimit;
}
// Refresh cache on startup
getGlobalLimit();

const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: async () => getGlobalLimit(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/update', updateRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/admin', adminRouter);

// Error handler
app.use(errorHandler);

const port = Number(config.PORT);
app.listen(port, () => {
  console.log(`DDNS API running on port ${port}`);
});

export default app;