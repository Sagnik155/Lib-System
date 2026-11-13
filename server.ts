import 'dotenv/config';
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/src/routes/api.ts';
import { errorHandler } from './server/src/middleware/errorHandler.ts';
import { db } from './server/src/config/db.ts';
import { runSeed } from './server/scripts/seed.ts';

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
  const PORT = (Number.isFinite(cliPort) && cliPort > 0 ? cliPort : undefined) || Number(process.env.PORT) || 3000;
  const HOST = getCliArg('--host') || '0.0.0.0';

  // Auto-seed if database is completely empty on startup
  if (db.books.length === 0 || db.users.length === 0) {
    console.log('📦 Database is uninitialized. Running auto-seed for instant demo readiness...');
    await runSeed();
  }

  // Middleware: Request parsing & Security headers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Library Management System API',
      timestamp: new Date().toISOString(),
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
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });
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
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
