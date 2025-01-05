import express from 'express';
import { BrowserManager } from './browsers/browser-manager';
import { createBrowserRouter } from './routes/browser';
import { setupFrontendMiddleware } from './middleware/frontend';
import { errorHandler } from './middleware/error';
import { config } from './config';
import { ConfigService } from './services/config-service';
import { BrowserStateService } from './services/browser-state';
import { findAvailablePort } from './utils/port';

// Cleanup function type
type CleanupFunction = () => Promise<void>;

async function createServer(): Promise<{ app: express.Application; cleanup: CleanupFunction }> {
  return new Promise(async (resolve, reject) => {
    try {
      const app = express();
      
      // 初始化服务
      const configService = new ConfigService();
      const browserManager = new BrowserManager();
      const browserState = new BrowserStateService(browserManager);

      // 日志输出当前环境和路径
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Base directory:', config.clientPath);
      console.log('Data directory:', config.dataDir);
      console.log('Config file:', config.configFile);
      console.log('Profiles directory:', config.profilesDir);

      // 使用JSON中间件
      app.use(express.json());

      // 加载配置
      const customBrowserConfigs = await configService.loadConfigs();

      // 设置API路由
      const browserRouter = createBrowserRouter(
        browserManager,
        browserState,
        customBrowserConfigs,
        configService
      );
      app.use('/api', browserRouter);

      // 创建清理函数
      const cleanup = async () => {
        console.log('Server shutting down...');
        browserState.cleanup();
        await browserManager.closeAll();
      };

      // 处理进程退出
      process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        await cleanup();
        process.exit(0);
      });

      // 设置前端中间件
      await setupFrontendMiddleware(app, {
        isDev: config.isDev,
        clientPath: config.clientPath
      });

      // 错误处理中间件
      app.use(errorHandler);

      // 查找可用端口
      const port = await findAvailablePort(Number(config.port));

      // 启动服务器
      const server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Mode: ${config.isDev ? 'development' : 'production'}`);
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
    process.on('beforeExit', cleanup);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 