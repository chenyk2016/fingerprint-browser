import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import browserConfigs from './config/browser-config';
import { BrowserManager } from './browsers/browser-manager';
import { BrowserConfig } from './types/browser';

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, '../data/browser-configs.json');
const PROFILES_BASE_DIR = path.join(__dirname, '../../profiles');

// 确保配置目录存在
async function ensureConfigDir() {
  const dir = path.dirname(CONFIG_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 确保用户数据目录存在
async function ensureProfileDir(configName: string) {
  const profileDir = path.join(PROFILES_BASE_DIR, configName);
  try {
    await fs.access(profileDir);
  } catch {
    await fs.mkdir(profileDir, { recursive: true });
  }
  return profileDir;
}

// 清理用户数据目录
async function cleanupProfileDir(configName: string) {
  const profileDir = path.join(PROFILES_BASE_DIR, configName);
  try {
    await fs.rm(profileDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up profile directory for ${configName}:`, error);
  }
}

// 加载保存的配置
async function loadSavedConfigs(): Promise<Record<string, BrowserConfig>> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No saved configs found, using default configs');
    return { ...browserConfigs };
  }
}

// 保存配置到文件
async function saveConfigs(configs: Record<string, BrowserConfig>): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving configs:', error);
  }
}

async function createServer(): Promise<void> {
  const app = express();
  const port = process.env.PORT || 3000;
  const browserManager = new BrowserManager();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, 'client')
  });

  app.use(express.json());

  // Track browser statuses and configs
  const browserStatuses: Record<string, string> = {};
  const customBrowserConfigs: Record<string, BrowserConfig> = await loadSavedConfigs();

  // API routes
  app.get('/api/browsers', (_req: Request, res: Response) => {
    try {
      const browsers: Browser[] = Object.entries(customBrowserConfigs).map(([configName, config]) => ({
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

  // 添加新的浏览器配置
  app.post('/api/browsers/:configName', async (req: Request, res: Response) => {
    const { configName } = req.params;
    const config: BrowserConfig = req.body;

    try {
      // 检查配置名是否已存在
      if (customBrowserConfigs[configName]) {
        return res.status(400).json({ error: 'Configuration name already exists' });
      }

      // 验证配置
      if (!config.name || !config.options) {
        return res.status(400).json({ error: 'Invalid configuration' });
      }

      // 创建并设置用户数据目录
      const userDataDir = await ensureProfileDir(configName);

      // 添加配置
      customBrowserConfigs[configName] = {
        ...config,
        options: {
          ...config.options,
          userDataDir,
          // 添加额外的隔离选项
          env: {
            ...process.env,
            CHROME_CONFIG_NAME: configName,
            CHROME_PROFILE_PATH: userDataDir
          }
        }
      };

      // 保存配置到文件
      await saveConfigs(customBrowserConfigs);

      res.status(201).json({ message: 'Browser configuration added successfully' });
    } catch (error) {
      console.error('Error adding browser configuration:', error);
      res.status(500).json({ error: 'Failed to add browser configuration' });
    }
  });

  app.post('/api/browsers/:configName/start', async (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      const config = customBrowserConfigs[configName];
      if (!config) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is already running' });
      }

      // 确保用户数据目录存在
      await ensureProfileDir(configName);

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
      if (!customBrowserConfigs[configName]) {
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
      // 检查配置是否存在
      if (!customBrowserConfigs[configName]) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      // 如果浏览器正在运行，先停止它
      if (browserManager.isBrowserRunning(configName)) {
        await browserManager.stopBrowser(configName);
      }
      
      // 删除配置
      delete customBrowserConfigs[configName];
      delete browserStatuses[configName];

      // 清理用户数据目录
      await cleanupProfileDir(configName);

      // 保存更新后的配置
      await saveConfigs(customBrowserConfigs);
      
      res.json({ message: 'Browser environment deleted successfully' });
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