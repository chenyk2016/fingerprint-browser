import { Express, Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import path from 'path';

interface FrontendOptions {
  isDev: boolean;
  clientPath: string;
}

export async function setupFrontendMiddleware(app: Express, options: FrontendOptions) {
  const { isDev, clientPath } = options;

  if (isDev) {
    // 开发环境：使用Vite中间件
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: clientPath,
      base: '/'
    });

    // 使用vite中间件
    app.use(vite.middlewares);

    // 开发环境SPA路由处理
    app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        vite.middlewares.handle(req, res, next);
      } catch (error: unknown) {
        console.error('Error handling route:', error instanceof Error ? error.message : 'Unknown error');
        next(error);
      }
    });
  } else {
    // 生产环境：使用静态文件服务
    console.log('Serving static files from:', clientPath);
    app.use(express.static(clientPath));

    // 生产环境SPA路由处理
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      try {
        const indexHtmlPath = path.join(clientPath, 'index.html');
        console.log('Serving index.html from:', indexHtmlPath);
        res.sendFile(indexHtmlPath);
      } catch (error: unknown) {
        console.error('Error handling route:', error instanceof Error ? error.message : 'Unknown error');
        next(error);
      }
    });
  }
} 