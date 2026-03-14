import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import updateRouter from './routes/update.js';
import domainsRouter from './routes/domains.js';
iimport adminRouter from './routes/admin.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({
  origin: config.APP_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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