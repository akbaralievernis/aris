import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import authRoutes from './routes/auth.js';
import turnRoutes from './routes/turn.js';
import { authRequired } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/turn', authRequired, turnRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`ARIS backend listening on ${config.port}`);
});
