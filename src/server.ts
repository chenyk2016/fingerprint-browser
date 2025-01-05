// 需要适配electron,fs的一些操作失败了

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { BrowserManager } from './browsers/browser-manager';
import { BrowserConfig } from './types/browser';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, '../data/browser-configs.json');
const PROFILES_BASE_DIR = path.join(process.cwd(), 'profiles');

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
    console.log('No saved configs found');
    return {};
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
  const port = process.env.PORT || 45813;
  const isDev = process.env.NODE_ENV === 'development';
  
  // 确定项目根目录和客户端目录
  const ROOT_DIR = process.cwd();
  const CLIENT_DEV_DIR = path.join(ROOT_DIR, 'src/client');
  const CLIENT_DIST_DIR = path.join(ROOT_DIR, 'dist/client');

  // 日志输出当前环境和路径
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Root directory:', ROOT_DIR);
  console.log('Client dev directory:', CLIENT_DEV_DIR);
  console.log('Client dist directory:', CLIENT_DIST_DIR);

  // 检查客户端目录是否存在
  try {
    if (isDev) {
      await fs.access(CLIENT_DEV_DIR);
      console.log('Client dev directory exists');
    } else {
      await fs.access(CLIENT_DIST_DIR);
      console.log('Client dist directory exists');
    }
  } catch (error) {
    console.error('Error accessing client directory:', error);
    throw new Error('Client directory not found');
  }

  const browserManager = new BrowserManager();

  // 使用JSON中间件
  app.use(express.json());

  // Create Vite server in middleware mode for development
  let vite: any;
  if (isDev) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: CLIENT_DEV_DIR
    });
  }

  // Track browser statuses and configs
  const browserStatuses: Record<string, string> = {};
  const customBrowserConfigs: Record<string, BrowserConfig> = await loadSavedConfigs();

  // 更新浏览器状态
  function updateBrowserStatus(configName: string, status: string) {
    console.log(`Updating browser status: ${configName} -> ${status}`);
    browserStatuses[configName] = status;
  }

  // 监听浏览器事件
  browserManager.on('browserClosed', (configName: string) => {
    console.log(`Browser closed event received: ${configName}`);
    updateBrowserStatus(configName, 'stopped');
  });

  browserManager.on('browserError', (configName: string, error: Error) => {
    console.error(`Browser error event received: ${configName}`, error);
    updateBrowserStatus(configName, 'error');
  });

  // 定期检查浏览器状态
  setInterval(() => {
    Object.keys(customBrowserConfigs).forEach(configName => {
      const isRunning = browserManager.isBrowserRunning(configName);
      const currentStatus = browserStatuses[configName];
      if (isRunning && currentStatus !== 'running') {
        updateBrowserStatus(configName, 'running');
      } else if (!isRunning && currentStatus === 'running') {
        updateBrowserStatus(configName, 'stopped');
      }
    });
  }, 5000);

  // API routes
  app.get('/api/browsers', (_req: Request, res: Response) => {
    try {
      // 在返回状态前检查一次所有浏览器的状态
      Object.keys(customBrowserConfigs).forEach(configName => {
        const isRunning = browserManager.isBrowserRunning(configName);
        if (!isRunning && browserStatuses[configName] === 'running') {
          updateBrowserStatus(configName, 'stopped');
        }
      });

      const browsers: Browser[] = Object.entries(customBrowserConfigs).map(([configName, config]) => ({
        configName,
        browserType: config.name,
        headless: config.options.headless,
        status: browserManager.isBrowserRunning(configName) ? 'running' : (browserStatuses[configName] || 'stopped')
      }));
      res.json(browsers);
    } catch (error) {
      console.error('Error getting browsers:', error);
      res.status(500).json({ error: 'Failed to get browsers' });
    }
  });

  // 获取浏览器配置详情
  app.get('/api/browsers/:configName/config', (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      const config = customBrowserConfigs[configName];
      if (!config) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      res.json(config);
    } catch (error) {
      console.error(`Error getting browser config ${configName}:`, error);
      res.status(500).json({ error: 'Failed to get browser configuration' });
    }
  });

  // 更新浏览器配置
  app.put('/api/browsers/:configName/config', async (req: Request, res: Response) => {
    const { configName } = req.params;
    const updatedConfig: BrowserConfig = req.body;
    
    try {
      // 检查配置是否存在
      if (!customBrowserConfigs[configName]) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      // 验证配置
      if (!updatedConfig.name || !updatedConfig.options) {
        return res.status(400).json({ error: 'Invalid configuration' });
      }

      // 如果浏览器正在运行，不允许更新配置
      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Cannot update configuration while browser is running' });
      }

      // 保持用户数据目录不变
      const userDataDir = customBrowserConfigs[configName].options.userDataDir;
      
      // 更新配置
      customBrowserConfigs[configName] = {
        ...updatedConfig,
        options: {
          ...updatedConfig.options,
          userDataDir
        }
      };

      // 保存配置到文件
      await saveConfigs(customBrowserConfigs);

      res.json({ message: 'Browser configuration updated successfully' });
    } catch (error) {
      console.error(`Error updating browser config ${configName}:`, error);
      res.status(500).json({ error: 'Failed to update browser configuration' });
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

  // 启动浏览器
  app.post('/api/browsers/:configName/start', async (req: Request, res: Response) => {
    const { configName } = req.params;
    try {
      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is already running' });
      }

      updateBrowserStatus(configName, 'starting');
      const config = customBrowserConfigs[configName];
      if (!config) {
        throw new Error('Browser config not found');
      }

      const userDataDir = await ensureProfileDir(configName);
      await browserManager.launchBrowser(configName, {
        ...config,
        options: {
          ...config.options,
          userDataDir
        }
      });

      updateBrowserStatus(configName, 'running');
      res.json({ status: 'success' });
    } catch (error) {
      console.error(`Error starting browser ${configName}:`, error);
      updateBrowserStatus(configName, 'error');
      res.status(500).json({ error: 'Failed to start browser' });
    }
  });

  // 停止浏览器
  app.post('/api/browsers/:configName/stop', async (req: Request, res: Response) => {
    const { configName } = req.params;
    try {
      if (!browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is not running' });
      }

      updateBrowserStatus(configName, 'stopping');
      await browserManager.stopBrowser(configName);
      updateBrowserStatus(configName, 'stopped');
      res.json({ status: 'success' });
    } catch (error) {
      console.error(`Error stopping browser ${configName}:`, error);
      updateBrowserStatus(configName, 'error');
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

  // 在API路由之后，添加静态文件服务和开发服务器中间件
  if (isDev && vite) {
    // Use vite's connect instance as middleware in development
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    console.log('Serving static files from:', CLIENT_DIST_DIR);
    app.use(express.static(CLIENT_DIST_DIR));
  }

  // Handle all other routes - 放在最后
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (isDev && vite) {
        // Let Vite handle the request in development
        vite.middlewares.handle(req, res, next);
      } else {
        // Serve index.html in production
        const indexHtmlPath = path.join(CLIENT_DIST_DIR, 'index.html');
        console.log('Serving index.html from:', indexHtmlPath);
        
        try {
          await fs.access(indexHtmlPath);
          res.sendFile(indexHtmlPath);
        } catch (error) {
          console.error('Error accessing index.html:', error);
          res.status(404).send('index.html not found');
        }
      }
    } catch (error) {
      console.error('Error handling route:', error);
      next(error);
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Mode: ${isDev ? 'development' : 'production'}`);
  });
}

// 确保 browserManager 实例在整个应用生命周期中存在
createServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 