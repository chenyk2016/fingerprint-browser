import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Server error:', err);

  // 根据错误类型返回不同的状态码
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ error: err.message });
  }

  // 默认返回500错误
  res.status(500).json({ error: 'Internal server error' });
} 