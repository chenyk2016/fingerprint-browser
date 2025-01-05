// 需要适配electron,fs的一些操作失败了

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { BrowserManager } from './browsers/browser-manager';
import { BrowserConfig } from './types/browser';
import dotenv from 'dotenv';

// 尝试导入electron，如果不可用则使用空对象
let electronApp;
try {
  const electron = require('electron');
  electronApp = electron.app;
} catch (error: unknown) {
  console.log('Electron app module not available, using fallback paths');
  electronApp = null;
}

// 加载环境变量
dotenv.config();

interface Browser {
  configName: string;
  browserType: string;
  headless: boolean;
  status?: string;
}

// 环境变量
const isDev = process.env.NODE_ENV === 'development';
const isPreview = process.env.NODE_ENV === 'preview';

// 获取用户数据目录
const getUserDataPath = (relativePath: string) => {
  if (isDev || isPreview) {
    // 开发环境：使用项目根目录下的临时目录
    return path.join(__dirname, '..', 'temp', relativePath);
  }

  // 生产环境：使用electron的userData目录
  // 获取用户数据目录的路径
  // 如果electron的app模块可用，则使用其提供的userData路径
  // 否则，根据操作系统类型，使用默认的userData路径
  const userDataPath = electronApp?.getPath('userData') || 
    (process.platform === 'darwin' ? 
      // macOS下，userData目录位于~/Library/Application Support/multi-browser
      path.join(process.env.HOME || '', 'Library/Application Support/multi-browser') : 
    // Windows和Linux下，userData目录位于%APPDATA%/multi-browser或/var/local/multi-browser
    path.join(process.env.APPDATA || '/var/local', 'multi-browser'));
  // 将相对路径拼接到userData目录路径上
  return path.join(userDataPath, relativePath);
};

// 客户端目录 - 使用相对路径
const CLIENT_PATH = isDev 
  ? path.join(__dirname, '..', 'src/client')
  : path.join(__dirname, '..', 'client');

// 数据目录 - 放在用户可写的位置
const DATA_DIR = getUserDataPath('data');
const PROFILES_BASE_DIR = getUserDataPath('profiles');

// 配置文件路径
const CONFIG_FILE_PATH = path.join(DATA_DIR, 'browser-configs.json');

// 确保目录存在
async function ensureDirectories() {
  const dirs = [DATA_DIR, PROFILES_BASE_DIR];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
      console.log(`Directory exists: ${dir}`);
    } catch (error: unknown) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (mkdirError: unknown) {
        console.error(`Failed to create directory ${dir}:`, mkdirError instanceof Error ? mkdirError.message : 'Unknown error');
        throw mkdirError;
      }
    }
  }
}

// 确保配置目录存在
async function ensureConfigDir() {
  try {
    await fs.access(DATA_DIR);
    console.log('Config directory exists:', DATA_DIR);
  } catch (error: unknown) {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log('Created config directory:', DATA_DIR);
    } catch (mkdirError: unknown) {
      console.error('Failed to create config directory:', mkdirError instanceof Error ? mkdirError.message : 'Unknown error');
      throw mkdirError;
    }
  }
}

// 确保用户数据目录存在
async function ensureProfileDir(configName: string) {
  const profileDir = path.join(PROFILES_BASE_DIR, configName);
  try {
    await fs.access(profileDir);
    console.log('Profile directory exists:', profileDir);
  } catch (error: unknown) {
    try {
      await fs.mkdir(profileDir, { recursive: true });
      console.log('Created profile directory:', profileDir);
    } catch (mkdirError: unknown) {
      console.error('Failed to create profile directory:', mkdirError instanceof Error ? mkdirError.message : 'Unknown error');
      throw mkdirError;
    }
  }
  return profileDir;
}

// 清理用户数据目录
async function cleanupProfileDir(configName: string) {
  const profileDir = path.join(PROFILES_BASE_DIR, configName);
  try {
    await fs.rm(profileDir, { recursive: true, force: true });
    console.log('Cleaned up profile directory:', profileDir);
  } catch (error: unknown) {
    console.error(`Error cleaning up profile directory for ${configName}:`, error instanceof Error ? error.message : 'Unknown error');
    // 不抛出错误，因为这是清理操作
  }
}

// 加载保存的配置
async function loadSavedConfigs(): Promise<Record<string, BrowserConfig>> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const configs = JSON.parse(data);
    console.log('Loaded configs from:', CONFIG_FILE_PATH);
    return configs;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
      console.log('No saved configs found, creating new config file');
      await saveConfigs({});
      return {};
    }
    console.error('Error loading configs:', error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

// 保存配置到文件
async function saveConfigs(configs: Record<string, BrowserConfig>): Promise<void> {
  try {
    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), 'utf-8');
    console.log('Saved configs to:', CONFIG_FILE_PATH);
  } catch (error: unknown) {
    console.error('Error saving configs:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Cleanup function type
type CleanupFunction = () => Promise<void>;

async function createServer(): Promise<{ app: express.Application; cleanup: CleanupFunction }> {
  return new Promise(async (resolve, reject) => {
    try {
      const app = express();
      const port = process.env.PORT || 45813;

      // 日志输出当前环境和路径
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Base directory:', path.join(__dirname, '..'));
      console.log('Current directory:', __dirname);
      console.log('Client path:', CLIENT_PATH);
      console.log('Data directory:', DATA_DIR);
      console.log('Config file:', CONFIG_FILE_PATH);
      console.log('Profiles directory:', PROFILES_BASE_DIR);

      // 确保所需目录存在
      await ensureDirectories();

      const browserManager = new BrowserManager();

      // 使用JSON中间件
      app.use(express.json());

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

      // API Routes - 确保API路由在前面处理
      const apiRouter = express.Router();

      apiRouter.get('/browsers', (_req: Request, res: Response) => {
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

      apiRouter.get('/browsers/:configName/config', (req: Request, res: Response) => {
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

      apiRouter.put('/browsers/:configName/config', async (req: Request, res: Response) => {
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

      apiRouter.post('/browsers/:configName', async (req: Request, res: Response) => {
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

      apiRouter.post('/browsers/:configName/start', async (req: Request, res: Response) => {
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

      apiRouter.post('/browsers/:configName/stop', async (req: Request, res: Response) => {
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

      apiRouter.delete('/browsers/:configName', async (req: Request, res: Response) => {
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

      // Mount API routes with prefix
      app.use('/api', apiRouter);

      // Create cleanup function
      const cleanup = async () => {
        console.log('Server shutting down, closing all browsers...');
        await browserManager.closeAll();
      };

      // Handle cleanup on server shutdown
      process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        await cleanup();
        process.exit(0);
      });

      // Create Vite server in middleware mode for development - 放在API路由之后
      let vite: any;
      if (isDev) {
        vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
          root: CLIENT_PATH,
          base: '/'
        });

        // 使用vite中间件
        app.use(vite.middlewares);
      } else {
        // 生产环境使用相对于__dirname的静态文件路径
        console.log('Serving static files from:', CLIENT_PATH);
        app.use(express.static(CLIENT_PATH));
      }

      // Handle all other routes - 放在最后
      app.get('*', async (req: Request, res: Response, next: NextFunction) => {
        try {
          if (isDev && vite) {
            // Let Vite handle the request in development
            vite.middlewares.handle(req, res, next);
          } else {
            // 使用相对路径
            const indexHtmlPath = path.join(CLIENT_PATH, 'index.html');
            console.log('Serving index.html from:', indexHtmlPath);
            res.sendFile(indexHtmlPath);
          }
        } catch (error: unknown) {
          console.error('Error handling route:', error instanceof Error ? error.message : 'Unknown error');
          next(error);
        }
      });

      // Error handling middleware - 始终放在最后
      app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal server error' });
      });

      // Start listening on port
      const server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Mode: ${isDev ? 'development' : 'production'}`);
        resolve({ app, cleanup });
      });

      server.on('error', (error) => {
        console.error('Server startup error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('Failed to create server:', error);
      reject(error);
    }
  });
}

// 启动服务器
createServer()
  .then(({ cleanup }) => {
    // Store cleanup function for later use if needed
    process.on('beforeExit', cleanup);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 