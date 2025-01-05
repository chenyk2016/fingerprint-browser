import puppeteer, { Browser, Page } from 'puppeteer';
import { BrowserConfig } from '../types/browser';
import { EventEmitter } from 'events';

interface BrowserInstance {
  browser: Browser;
  page: Page;
}

export class BrowserManager extends EventEmitter {
  private browsers: Map<string, BrowserInstance>;

  constructor() {
    super();
    this.browsers = new Map();
  }

  async launchBrowser(
    browserType: string,
    config: BrowserConfig
  ): Promise<{ browser: Browser; page: Page }> {
    try {
      if (this.isBrowserRunning(browserType)) {
        throw new Error('Browser is already running');
      }

      const browser = await puppeteer.launch(config.options);
      
      // 获取已有的页面，而不是创建新页面
      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();

      // 检查浏览器是否已关闭
      const checkBrowserClosed = async () => {
        // 如果浏览器已断开连接，则认为已关闭
        if (!browser.isConnected()) {
          this.browsers.delete(browserType); // 从浏览器实例映射中删除已关闭的浏览器
          this.emit('browserClosed', browserType); // 发射浏览器已关闭的事件
          return; // 结束函数执行
        }
        // 获取当前浏览器的所有页面
        const pages = await browser.pages();
        // 如果浏览器中没有任何页面，则认为已关闭
        if (pages.length === 0) {
          // 关闭实例
          await browser.close();
          this.browsers.delete(browserType); // 从浏览器实例映射中删除已关闭的浏览器
          this.emit('browserClosed', browserType); // 发射浏览器已关闭的事件
        }
      };

      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log(`Browser ${browserType} disconnected`);
        this.browsers.delete(browserType);
        this.emit('browserClosed', browserType);
      });

      // 监听页面关闭事件
      page.on('close', () => {
        console.log(`Page in browser ${browserType} closed`);
        checkBrowserClosed();
      });

      // 监听目标销毁事件
      browser.on('targetdestroyed', (target: any) => {
        console.log(`Target in browser ${browserType} destroyed:`, target.type());
        checkBrowserClosed();
      });

      const instance = { browser, page };
      this.browsers.set(browserType, instance);
      return instance;
    } catch (error) {
      console.error(`Error launching browser ${browserType}:`, error);
      this.emit('browserError', browserType, error);
      throw error;
    }
  }

  async stopBrowser(browserType: string): Promise<void> {
    try {
      const instance = this.browsers.get(browserType);
      if (!instance) {
        return;
      }

      if (instance.browser.isConnected()) {
        await instance.browser.close();
      }
      this.browsers.delete(browserType);
      this.emit('browserClosed', browserType);
    } catch (error) {
      console.error(`Error stopping browser ${browserType}:`, error);
      this.emit('browserError', browserType, error);
      throw error;
    }
  }

  getBrowserInstance(browserType: string): BrowserInstance | undefined {
    const instance = this.browsers.get(browserType);
    if (!instance || !instance.browser.isConnected()) {
      this.browsers.delete(browserType);
      this.emit('browserClosed', browserType);
      return undefined;
    }
    return instance;
  }

  isBrowserRunning(browserType: string): boolean {
    const instance = this.browsers.get(browserType);
    if (!instance) {
      return false;
    }
    const isConnected = instance.browser.isConnected();
    if (!isConnected) {
      this.browsers.delete(browserType);
      this.emit('browserClosed', browserType);
    }
    return isConnected;
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.browsers.values()).map(async ({ browser }) => {
      if (browser.isConnected()) {
        await browser.close();
      }
    });

    await Promise.all(closePromises);
    this.browsers.clear();
  }
}