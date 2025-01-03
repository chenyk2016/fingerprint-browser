import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import browserConfigs from './config/browser-config';
import { BrowserManager } from './browsers/browser-manager';

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

async function createServer(): Promise<void> {
  const app = express();
  const port = process.env.PORT || 3000;
  const browserManager = new BrowserManager();
  console.log('browserManager', browserManager);
  

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, 'client')
  });

  app.use(express.json());

  // Track browser statuses
  const browserStatuses: Record<string, string> = {};

  // API routes
  app.get('/api/browsers', (_req: Request, res: Response) => {
    try {
      const browsers: Browser[] = Object.entries(browserConfigs).map(([configName, config]) => ({
        configName,
        browserType: config.name,
        headless: config.options.headless,
        status: browserManager.isBrowserRunning(configName) ? 'running' : (browserStatuses[configName] || 'stopped')
      }));
      res.json(browsers);
    } catch (error) {
      console.error('Error reading browser configs:', error);
      res.status(500).json({ error: 'Failed to read browser configurations' });
    }
  });

  app.post('/api/browsers/:configName/start', async (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      const config = browserConfigs[configName];
      if (!config) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is already running' });
      }

      await browserManager.launchBrowser(
        configName,
        config.options,
        config.fingerprint
      );
      
      browserStatuses[configName] = 'running';
      res.json({ message: 'Browser started successfully', status: 'running' });
    } catch (error) {
      console.error(`Error starting browser ${configName}:`, error);
      browserStatuses[configName] = 'error';
      res.status(500).json({ error: 'Failed to start browser' });
    }
  });

  app.post('/api/browsers/:configName/stop', async (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      if (!browserConfigs[configName]) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      if (!browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is not running' });
      }

      await browserManager.stopBrowser(configName);
      browserStatuses[configName] = 'stopped';
      res.json({ message: 'Browser stopped successfully', status: 'stopped' });
    } catch (error) {
      console.error(`Error stopping browser ${configName}:`, error);
      browserStatuses[configName] = 'error';
      res.status(500).json({ error: 'Failed to stop browser' });
    }
  });

  app.delete('/api/browsers/:configName', async (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      // Stop the browser if it's running
      if (browserManager.isBrowserRunning(configName)) {
        await browserManager.stopBrowser(configName);
      }
      
      delete browserStatuses[configName];
      // Here you would also remove the configuration from your persistent storage
      
      res.json({ message: 'Browser environment deleted' });
    } catch (error) {
      console.error(`Error deleting browser ${configName}:`, error);
      res.status(500).json({ error: 'Failed to delete browser environment' });
    }
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', async () => {
    console.log('Server shutting down, closing all browsers...');
    await browserManager.closeAll();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal, closing all browsers...');
    await browserManager.closeAll();
    process.exit(0);
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // Serve static files for production
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // Handle all other routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    // For development, let Vite handle the request
    if (process.env.NODE_ENV === 'development') {
      vite.middlewares.handle(req, res, next);
    } else {
      // For production, serve the built index.html
      res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// 确保 browserManager 实例在整个应用生命周期中存在
createServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 