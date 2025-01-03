const express = require('express');
const path = require('path');
const { createServer: createViteServer } = require('vite');

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, 'client') // 指定 Vite 项目根目录
  });

  app.use(express.json());

  // API routes
  app.get('/api/browsers', async (req, res) => {
    console.log('api/browsers');
    try {
      const browserConfigs = require('./config/browser-config.js');
      const browsers = Object.entries(browserConfigs).map(([configName, config]) => ({
        configName,
        browserType: config.name,
        headless: config.options.headless
      }));
      res.json(browsers);
    } catch (error) {
      console.error('Error reading browser configs:', error);
      res.status(500).json({ error: 'Failed to read browser configurations' });
    }
  });

  app.post('/api/browsers', (req, res) => {
    // Your existing browser creation logic
    res.status(201).json({ message: 'Browser environment created' });
  });

  app.delete('/api/browsers/:configName', (req, res) => {
    // Your existing browser deletion logic
    res.json({ message: 'Browser environment deleted' });
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // Serve static files for production
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // Handle all other routes
  app.get('*', (req, res, next) => {
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

createServer();