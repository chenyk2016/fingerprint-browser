import React, { useState, useEffect } from 'react';
import BrowserForm from './components/BrowserForm';
import BrowserList from './components/BrowserList';
import { Browser, BrowserConfig } from './types/browser';

interface ScreenSize {
  width: number;
  height: number;
}

function App(): React.ReactElement {
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setScreenSize] = useState<ScreenSize>({ width: 1920, height: 1080 });

  useEffect(() => {
    fetchBrowsers();
    // 获取屏幕尺寸
    setScreenSize({
      width: window.screen.width || 1920,
      height: window.screen.height || 1080
    });

    // 设置定期刷新
    const intervalId = setInterval(fetchBrowsers, 5000);

    // 清理函数
    return () => clearInterval(intervalId);
  }, []);

  const fetchBrowsers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/browsers');
      const data = await response.json() as Browser[];
      setBrowsers(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching browsers:', error);
      setError('获取浏览器列表失败');
    }
  };

  const handleAddBrowser = async (browserData: { browserType: string; configName: string; headless: boolean }): Promise<void> => {
    try {
      // 生成随机端口
      const remoteDebuggingPort = Math.floor(Math.random() * (9999 - 9000 + 1) + 9000);
      
      // 构建配置对象
      const config: BrowserConfig = {
        name: browserData.browserType,
        options: {
          // 是否以无头模式运行浏览器
          headless: browserData.headless,
          // 禁用默认视口大小限制
          defaultViewport: null,
          args: [
            // 禁用通知提示
            '--disable-notifications',
            // 禁用自动化控制检测
            '--disable-blink-features=AutomationControlled', 
            // 禁用沙箱模式,提高稳定性
            '--no-sandbox',
            // 禁用setuid沙箱
            '--disable-setuid-sandbox',
            // 设置远程调试端口
            `--remote-debugging-port=${remoteDebuggingPort}`,
            // 禁用浏览器扩展
            '--disable-extensions',
            // 设置User-Agent
            `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`
          ],
          // 忽略默认的自动化参数
          ignoreDefaultArgs: ['--enable-automation'],
          // 忽略HTTPS证书错误
          ignoreHTTPSErrors: true
        },
      };

      const response = await fetch(`/api/browsers/${browserData.configName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加浏览器失败');
      }

      await fetchBrowsers();
      setError(null);
    } catch (error) {
      console.error('Error adding browser:', error);
      setError(error instanceof Error ? error.message : '添加浏览器失败');
    }
  };

  const handleStartBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/start`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('启动浏览器失败');
      }
      await fetchBrowsers();
    } catch (error) {
      console.error('Error starting browser:', error);
      setError(error instanceof Error ? error.message : '启动浏览器失败');
    }
  };

  const handleStopBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/stop`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('关闭浏览器失败');
      }
      await fetchBrowsers();
    } catch (error) {
      console.error('Error stopping browser:', error);
      setError(error instanceof Error ? error.message : '关闭浏览器失败');
    }
  };

  const handleDeleteBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchBrowsers();
        setError(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || '删除浏览器失败');
      }
    } catch (error) {
      console.error('Error deleting browser:', error);
      setError(error instanceof Error ? error.message : '删除浏览器失败');
    }
  };

  const handleUpdateConfig = async (configName: string, updatedConfig: BrowserConfig): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新配置失败');
      }

      await fetchBrowsers();
      setError(null);
    } catch (error) {
      console.error('Error updating config:', error);
      setError(error instanceof Error ? error.message : '更新配置失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">浏览器环境管理</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <BrowserForm onSubmit={handleAddBrowser} />
      <BrowserList
        browsers={browsers}
        onDelete={handleDeleteBrowser}
        onStart={handleStartBrowser}
        onStop={handleStopBrowser}
        onUpdateConfig={handleUpdateConfig}
      />
    </div>
  );
}

export default App; 