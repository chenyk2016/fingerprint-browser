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
      const page = await browser.newPage();

      const checkBrowserClosed = async () => {
        if (!browser.isConnected()) {
          this.browsers.delete(browserType);
          this.emit('browserClosed', browserType);
          return;
        }
        const pages = await browser.pages();
        if (pages.length === 0) {
          this.browsers.delete(browserType);
          this.emit('browserClosed', browserType);
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