import puppeteer, { Browser, Page } from 'puppeteer';
import { BrowserConfig } from '../types/browser';

interface BrowserInstance {
  browser: Browser;
  page: Page;
}

// 添加必要的类型定义
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

interface CustomWindow extends Window {
  AudioContext: any;
  webkitAudioContext: any;
}

interface CustomNavigator extends Navigator {
  hardwareConcurrency: number;
  deviceMemory: number;
}

interface WebGLRenderingContextCustom extends WebGLRenderingContext {
  getParameter(parameter: number): any;
}

export class BrowserManager {
  private browsers: Map<string, BrowserInstance>;

  constructor() {
    this.browsers = new Map();
  }

  async launchBrowser(
    browserType: string,
    options: BrowserConfig['options'],
    fingerprint?: BrowserConfig['fingerprint']
  ): Promise<{ browser: Browser; page: Page }> {
    try {
      if (this.isBrowserRunning(browserType)) {
        throw new Error('Browser is already running');
      }

      const browser = await puppeteer.launch(options);
      const page = await browser.newPage();

      if (!browser.isConnected()) {
        throw new Error('Browser failed to connect');
      }

      if (fingerprint) {
        await this.applyFingerprint(page, fingerprint);
      }

      const instance = { browser, page };
      this.browsers.set(browserType, instance);
      return instance;
    } catch (error) {
      console.error(`Error launching browser ${browserType}:`, error);
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
    } catch (error) {
      console.error(`Error stopping browser ${browserType}:`, error);
      throw error;
    }
  }

  getBrowserInstance(browserType: string): BrowserInstance | undefined {
    const instance = this.browsers.get(browserType);
    if (!instance) {
      return undefined;
    }

    if (!instance.browser.isConnected()) {
      this.browsers.delete(browserType);
      return undefined;
    }

    return instance;
  }

  isBrowserRunning(browserType: string): boolean {
    const instance = this.browsers.get(browserType);
    if (!instance) {
      return false;
    }
    return instance.browser.isConnected();
  }

  private async applyFingerprint(page: Page, fingerprint: NonNullable<BrowserConfig['fingerprint']>): Promise<void> {
    await page.evaluateOnNewDocument((fingerprint) => {
      try {
        // Override navigator properties
        const nav = navigator as CustomNavigator;
        Object.defineProperties(nav, {
          userAgent: { value: fingerprint.navigator.userAgent },
          platform: { value: fingerprint.navigator.platform },
          language: { value: fingerprint.navigator.language },
          languages: { value: fingerprint.navigator.languages },
          hardwareConcurrency: { value: fingerprint.navigator.hardwareConcurrency },
          deviceMemory: { value: fingerprint.navigator.deviceMemory }
        });

        // Override screen properties
        Object.defineProperties(screen, {
          width: { value: fingerprint.screen.width },
          height: { value: fingerprint.screen.height },
          colorDepth: { value: fingerprint.screen.colorDepth },
          pixelDepth: { value: fingerprint.screen.pixelDepth }
        });

        // Override WebGL properties
        const getContextProto = HTMLCanvasElement.prototype.getContext;
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
          value: function(type: string, attributes: any) {
            const context = getContextProto.call(this, type, attributes);
            if (context && ['webgl', 'webgl2'].includes(type)) {
              const glContext = context as WebGLRenderingContextCustom;
              const getParameterProto = glContext.getParameter.bind(glContext);
              glContext.getParameter = function(parameter: number) {
                // WebGL constants
                const VENDOR = 0x1F00;
                const RENDERER = 0x1F01;

                switch (parameter) {
                  case VENDOR:
                    return fingerprint.webgl.vendor;
                  case RENDERER:
                    return fingerprint.webgl.renderer;
                  default:
                    return getParameterProto(parameter);
                }
              };
            }
            return context;
          }
        });

        // Override audio properties
        const win = window as CustomWindow;
        const AudioCtx = win.AudioContext || win.webkitAudioContext;
        if (AudioCtx) {
          const originalCreateAnalyser = AudioCtx.prototype.createAnalyser;
          AudioCtx.prototype.createAnalyser = function() {
            const analyser = originalCreateAnalyser.call(this);
            Object.defineProperties(analyser, {
              sampleRate: { value: fingerprint.audio.sampleRate },
              channelCount: { value: fingerprint.audio.channels }
            });
            return analyser;
          };
        }
      } catch (error) {
        console.error('Error applying fingerprint:', error);
      }
    }, fingerprint);
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