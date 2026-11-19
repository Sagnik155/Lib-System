import 'dotenv/config';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/src/routes/api.ts';
import { errorHandler } from './server/src/middleware/errorHandler.ts';
import { connectDb, closeDb, db } from './server/src/config/db.ts';
import { runSeed } from './server/scripts/seed.ts';
import { migrateFromJsonIfPresent } from './server/scripts/migrateFromJson.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCliArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith(`${flag}=`)) {
      return args[i].slice(flag.length + 1);
    }
  }
  return undefined;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const cliPort = Number(getCliArg('--port'));
  const PORT =
    (Number.isFinite(cliPort) && cliPort > 0 ? cliPort : undefined) ||
    Number(process.env.PORT) ||
    3000;
  const HOST = getCliArg('--host') || '0.0.0.0';

  // Attempt MongoDB Atlas connection on startup (non-fatal if MONGODB_URI is not yet configured)
  let dbInitError: string | null = null;
  const ensureConnectedAndSeeded = async (): Promise<void> => {
    if (db.isConnected()) return;
    await connectDb();
    dbInitError = null;
    const [booksCount, usersCount] = await Promise.all([
      db.books.countDocuments(),
      db.users.countDocuments(),
    ]);
    if (booksCount === 0 || usersCount === 0) {
      console.log('📦 MongoDB Atlas database is empty. Checking for existing .db_store.json data...');
      const migrated = await migrateFromJsonIfPresent();
      if (!migrated) {
        console.log('🌱 No .db_store.json found. Running auto-seed for demo readiness...');
        await runSeed();
      }
    }
  };

  try {
    await ensureConnectedAndSeeded();
  } catch (err) {
    dbInitError = err instanceof Error ? err.message : 'Unable to connect to MongoDB Atlas.';
    console.warn(`⚠️ MongoDB Atlas not connected yet: ${dbInitError}`);
    console.warn('   Server will still start on port 3000. Add MONGODB_URI to Secrets or .env and restart.');
  }

  // Security Middleware: Helmet, CORS, Rate Limiting, and Request Parsing
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests from this IP. Please try again shortly.',
      },
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many authentication attempts. Please wait a few minutes and try again.',
      },
    },
  });

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Library Management System API',
      database: db.isConnected() ? `MongoDB Atlas via Mongoose (${db.getDatabaseName()})` : 'disconnected',
      ...(dbInitError && !db.isConnected() ? { databaseError: dbInitError } : {}),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/activate', authLimiter);
  app.use('/api', apiLimiter);

  // Ensure MongoDB Atlas is connected before serving API routes
  app.use('/api', async (_req, res, next) => {
    if (db.isConnected()) return next();
    const hasConfiguredUri = Boolean(
      (process.env.MONGODB_URI || process.env.MONGO_URI)?.trim() &&
        !(process.env.MONGODB_URI || process.env.MONGO_URI)?.includes('<username>') &&
        !(process.env.MONGODB_URI || process.env.MONGO_URI)?.includes('<password>')
    );
    if (hasConfiguredUri) {
      try {
        await ensureConnectedAndSeeded();
        return next();
      } catch (err) {
        dbInitError = err instanceof Error ? err.message : 'Unable to connect to MongoDB Atlas.';
      }
    }
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          dbInitError ||
          'MongoDB Atlas is not connected. Add MONGODB_URI to Secrets or .env and restart the server.',
      },
    });
  });

  // Mount API router under /api
  app.use('/api', apiRouter);

  // Centralized Error Handler for /api
  app.use('/api', errorHandler);

  // Frontend integration: Vite middleware in dev or static files in production
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.log('⚡ Mounting Vite dev middleware...');
    const disableHmr = process.env.DISABLE_HMR === 'true' || Boolean(process.env.K_SERVICE);
    if (disableHmr) {
      process.env.DISABLE_HMR = 'true';
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        ws: disableHmr ? false : undefined,
      },
      appType: 'spa',
    });

    if (disableHmr) {
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!queryToInject || url.includes(queryToInject)) return url;
  return url + (url.includes('?') ? '&' : '?') + queryToInject;
}
export class ErrorOverlay {}
`);
      });
    }

    app.use(vite.middlewares);
  } else {
    console.log('📁 Serving production static files from dist...');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Library Management System running at http://${HOST}:${PORT}`);
      resolve();
    });
  });

  const shutdown = async () => {
    console.log('🛑 Shutting down gracefully...');
    await closeDb();
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
