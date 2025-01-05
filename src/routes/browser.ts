import { Router, Request, Response } from 'express';
import { BrowserConfig } from '../types/browser';
import { BrowserManager } from '../browsers/browser-manager';
import { BrowserStateService } from '../services/browser-state';
import { ConfigService } from '../services/config-service';

export function createBrowserRouter(
  browserManager: BrowserManager,
  browserState: BrowserStateService,
  customBrowserConfigs: Record<string, BrowserConfig>,
  configService: ConfigService
) {
  const router = Router();

  // 获取所有浏览器
  router.get('/browsers', (_req: Request, res: Response) => {
    try {
      const browsers = Object.entries(customBrowserConfigs).map(([configName, config]) => ({
        configName,
        browserType: config.name,
        headless: config.options.headless,
        status: browserManager.isBrowserRunning(configName) ? 'running' : browserState.getStatus(configName)
      }));
      res.json(browsers);
    } catch (error) {
      console.error('Error getting browsers:', error);
      res.status(500).json({ error: 'Failed to get browsers' });
    }
  });

  // 获取浏览器配置
  router.get('/browsers/:configName/config', (req: Request, res: Response) => {
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
  router.put('/browsers/:configName/config', async (req: Request, res: Response) => {
    const { configName } = req.params;
    const updatedConfig: BrowserConfig = req.body;
    
    try {
      if (!customBrowserConfigs[configName]) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      if (!updatedConfig.name || !updatedConfig.options) {
        return res.status(400).json({ error: 'Invalid configuration' });
      }

      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Cannot update configuration while browser is running' });
      }

      const userDataDir = customBrowserConfigs[configName].options.userDataDir;
      
      const newConfig = {
        ...updatedConfig,
        options: {
          ...updatedConfig.options,
          userDataDir
        }
      };

      await configService.updateConfig(configName, newConfig);
      customBrowserConfigs[configName] = newConfig;

      res.json({ message: 'Browser configuration updated successfully' });
    } catch (error) {
      console.error(`Error updating browser config ${configName}:`, error);
      res.status(500).json({ error: 'Failed to update browser configuration' });
    }
  });

  // 创建新的浏览器配置
  router.post('/browsers/:configName', async (req: Request, res: Response) => {
    const { configName } = req.params;
    const config: BrowserConfig = req.body;

    try {
      if (customBrowserConfigs[configName]) {
        return res.status(400).json({ error: 'Configuration name already exists' });
      }

      if (!config.name || !config.options) {
        return res.status(400).json({ error: 'Invalid configuration' });
      }

      const userDataDir = await configService.ensureProfileDir(configName);

      const newConfig = {
        ...config,
        options: {
          ...config.options,
          userDataDir,
        }
      };

      await configService.updateConfig(configName, newConfig);
      customBrowserConfigs[configName] = newConfig;

      res.status(201).json({ message: 'Browser configuration added successfully' });
    } catch (error) {
      console.error('Error adding browser configuration:', error);
      res.status(500).json({ error: 'Failed to add browser configuration' });
    }
  });

  // 启动浏览器
  router.post('/browsers/:configName/start', async (req: Request, res: Response) => {
    const { configName } = req.params;
    try {
      if (browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is already running' });
      }

      browserState.updateStatus(configName, 'starting');
      const config = customBrowserConfigs[configName];
      if (!config) {
        throw new Error('Browser config not found');
      }

      const userDataDir = await configService.ensureProfileDir(configName);
      await browserManager.launchBrowser(configName, {
        ...config,
        options: {
          ...config.options,
          userDataDir
        }
      });

      browserState.updateStatus(configName, 'running');
      res.json({ status: 'success' });
    } catch (error) {
      console.error(`Error starting browser ${configName}:`, error);
      browserState.updateStatus(configName, 'error');
      res.status(500).json({ error: 'Failed to start browser' });
    }
  });

  // 停止浏览器
  router.post('/browsers/:configName/stop', async (req: Request, res: Response) => {
    const { configName } = req.params;
    try {
      if (!browserManager.isBrowserRunning(configName)) {
        return res.status(400).json({ error: 'Browser is not running' });
      }

      browserState.updateStatus(configName, 'stopping');
      await browserManager.stopBrowser(configName);
      browserState.updateStatus(configName, 'stopped');
      res.json({ status: 'success' });
    } catch (error) {
      console.error(`Error stopping browser ${configName}:`, error);
      browserState.updateStatus(configName, 'error');
      res.status(500).json({ error: 'Failed to stop browser' });
    }
  });

  // 删除浏览器配置
  router.delete('/browsers/:configName', async (req: Request, res: Response) => {
    const { configName } = req.params;
    
    try {
      if (!customBrowserConfigs[configName]) {
        return res.status(404).json({ error: 'Browser configuration not found' });
      }

      if (browserManager.isBrowserRunning(configName)) {
        await browserManager.stopBrowser(configName);
      }
      
      await configService.deleteConfig(configName);
      delete customBrowserConfigs[configName];
      
      res.json({ message: 'Browser environment deleted successfully' });
    } catch (error) {
      console.error(`Error deleting browser ${configName}:`, error);
      res.status(500).json({ error: 'Failed to delete browser environment' });
    }
  });

  return router;
} 