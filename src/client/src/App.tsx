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
  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 1920, height: 1080 });

  useEffect(() => {
    fetchBrowsers();
    // 获取屏幕尺寸
    setScreenSize({
      width: window.screen.width || 1920,
      height: window.screen.height || 1080
    });
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
          headless: browserData.headless,
          defaultViewport: {
            width: screenSize.width,
            height: screenSize.height - 100
          },
          args: [
            '--disable-notifications',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--lang=zh-CN',
            `--window-size=${screenSize.width},${screenSize.height}`,
            `--remote-debugging-port=${remoteDebuggingPort}`,
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36`,
            '--password-store=basic'
          ],
          ignoreDefaultArgs: ['--enable-automation'],
          ignoreHTTPSErrors: true
        },
        fingerprint: {
          navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            platform: 'Win32',
            language: 'zh-CN',
            languages: ['zh-CN', 'zh', 'en-US'],
            hardwareConcurrency: Math.floor(Math.random() * (16 - 4 + 1) + 4), // 随机 4-16 核
            deviceMemory: [2, 4, 8, 16][Math.floor(Math.random() * 4)] // 随机内存大小
          },
          screen: {
            width: screenSize.width,
            height: screenSize.height,
            colorDepth: 24,
            pixelDepth: 24
          },
          webgl: {
            vendor: 'Google Inc.',
            renderer: 'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
            vendorHash: Math.random().toString(36).substring(7),
            rendererHash: Math.random().toString(36).substring(7)
          },
          audio: {
            sampleRate: [44100, 48000][Math.floor(Math.random() * 2)],
            channels: [2, 4, 6][Math.floor(Math.random() * 3)]
          },
          timezone: {
            offset: -new Date().getTimezoneOffset(),
            zone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
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
        method: 'POST',
      });
      if (response.ok) {
        await fetchBrowsers();
        setError(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || '启动浏览器失败');
      }
    } catch (error) {
      console.error('Error starting browser:', error);
      setError(error instanceof Error ? error.message : '启动浏览器失败');
    }
  };

  const handleStopBrowser = async (configName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/browsers/${configName}/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchBrowsers();
        setError(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || '停止浏览器失败');
      }
    } catch (error) {
      console.error('Error stopping browser:', error);
      setError(error instanceof Error ? error.message : '停止浏览器失败');
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