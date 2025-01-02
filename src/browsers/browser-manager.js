const { puppeteer, customEvasions } = require('../utils/stealth');
const fs = require('fs').promises;
const path = require('path');

class BrowserManager {
  constructor() {
    this.browsers = new Map();
    this.pages = new Map();
    this.saveStateDebounced = new Map();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async launchBrowser(browserType, options, fingerprint) {
    try {
      if (options.userDataDir) {
        await fs.mkdir(options.userDataDir, { recursive: true });
      }

      // 增加反检测参数
      const enhancedOptions = {
        ...options,
        args: [
          ...(options.args || []),
          // 新版本推荐的参数
          '--enable-automation',  // 新版本不建议隐藏自动化
          '--allow-pre-commit-input',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-features=Translate,BackForwardCache,AcceptCHFrame',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-sync',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-first-run',
          '--no-default-browser-check',
          '--no-sandbox',
          '--password-store=basic',
          '--use-mock-keychain',
        ],
        // 新版本的性能优化选项
        protocolTimeout: 30000,
        timeout: 30000,
        ignoreHTTPSErrors: true,
      };

      // 在创建浏览器实例时添加新的错误处理
      const browser = await puppeteer.launch(enhancedOptions).catch(error => {
        console.error('浏览器启动失败:', error);
        throw new Error(`无法启动浏览器: ${error.message}`);
      });
      this.browsers.set(browserType, browser);
      
      const page = await browser.newPage();
      this.pages.set(browserType, page);

      // 设置视口大小
      if (options.defaultViewport) {
        await page.setViewport(options.defaultViewport);
      }

      // 优化内存使用
      if (browser.process() !== null) {
        browser.process().setMaxListeners(100);
      }

      // 应用所有反检测措施
      await this.applyAntiDetection(page);
      
      // 应用指纹设置
      if (fingerprint) {
        await this.applyFingerprint(page, fingerprint);
      }
      
      await this.setupPageListeners(page, browserType);
      
      return { browser, page };
    } catch (error) {
      console.error(`启动浏览器失败: ${browserType}`, error);
      throw error;
    }
  }

  async applyFingerprint(page, fingerprint) {
    // 注入指纹修改脚本
    await page.evaluateOnNewDocument((fp) => {
      // 修改 navigator 属性
      if (fp.navigator) {
        Object.defineProperties(navigator, {
          userAgent: { value: fp.navigator.userAgent },
          platform: { value: fp.navigator.platform },
          language: { value: fp.navigator.language },
          languages: { value: fp.navigator.languages },
          hardwareConcurrency: { value: fp.navigator.hardwareConcurrency },
          deviceMemory: { value: fp.navigator.deviceMemory },
        });
      }

      // 修改 screen 属性
      if (fp.screen) {
        Object.defineProperties(screen, {
          width: { value: fp.screen.width },
          height: { value: fp.screen.height },
          colorDepth: { value: fp.screen.colorDepth },
          pixelDepth: { value: fp.screen.pixelDepth },
          availWidth: { value: fp.screen.width },
          availHeight: { value: fp.screen.height },
          availLeft: { value: 0 },
          availTop: { value: 0 },
        });

        // 修改 window.innerWidth 和 window.innerHeight
        Object.defineProperties(window, {
          innerWidth: { value: fp.screen.width, configurable: true },
          innerHeight: { value: fp.screen.height, configurable: true },
          outerWidth: { value: fp.screen.width, configurable: true },
          outerHeight: { value: fp.screen.height, configurable: true },
        });
      }

      // 修改 WebGL 信息
      if (fp.webgl) {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) {
            return fp.webgl.vendor;
          }
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446) {
            return fp.webgl.renderer;
          }
          return getParameter.call(this, parameter);
        };
      }

      // 修改音频上下文
      if (fp.audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const originalAudioContext = AudioContext;
        window.AudioContext = class extends originalAudioContext {
          constructor() {
            super();
            Object.defineProperty(this, 'sampleRate', {
              value: fp.audio.sampleRate
            });
          }
        };
        window.webkitAudioContext = window.AudioContext;
      }

      // 添加噪音以防止 canvas 指纹
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        const context = originalGetContext.call(this, type, attributes);
        if (context && type === '2d') {
          const originalFillText = context.fillText;
          context.fillText = function(...args) {
            originalFillText.apply(this, args);
            const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              // 添加微小的随机噪音
              imageData.data[i] += Math.random() * 2 - 1;
              imageData.data[i + 1] += Math.random() * 2 - 1;
              imageData.data[i + 2] += Math.random() * 2 - 1;
            }
            context.putImageData(imageData, 0, 0);
          };
        }
        return context;
      };

    }, fingerprint);

    // 设置 User-Agent
    if (fingerprint.navigator?.userAgent) {
      await page.setUserAgent(fingerprint.navigator.userAgent);
    }

    // 设置视口大小
    if (fingerprint.screen) {
      await page.setViewport({
        width: fingerprint.screen.width,
        height: fingerprint.screen.height,
        deviceScaleFactor: 1,
      });
    }

    // 设置地理位置模拟（可选）
    const client = await page.createCDPSession();
    await client.send('Emulation.setGeolocationOverride', {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 100
    });
  }

  async setupPageListeners(page, browserType) {
    if (!this.saveStateDebounced.has(browserType)) {
      this.saveStateDebounced.set(
        browserType,
        this.debounce(async () => {
          try {
            await this.saveBrowserState(browserType);
          } catch (error) {
            console.error(`自动保存状态失败: ${browserType}`, error);
          }
        }, 1000)
      );
    }

    page.on('domcontentloaded', () => {
      this.saveStateDebounced.get(browserType)();
    });

    page.on('error', error => {
      console.error(`页面错误: ${browserType}`, error);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`页面控制台错误: ${browserType}`, msg.text());
      }
    });

    // 添加更多错误监听
    page.on('pageerror', error => {
      console.error(`页面 JavaScript 错误: ${browserType}`, error);
    });
    
    page.on('requestfailed', request => {
      console.error(`请求失败: ${browserType}`, {
        url: request.url(),
        errorText: request.failure().errorText
      });
    });
    
    // 监控内存使用
    setInterval(async () => {
      try {
        const metrics = await page.metrics();
        if (metrics.JSHeapUsedSize > 800 * 1024 * 1024) { // 800MB
          console.warn(`内存使用过高: ${browserType}`, metrics);
        }
      } catch (error) {
        // 忽略错误
      }
    }, 30000);
  }

  async saveBrowserState(browserType) {
    try {
      const page = this.pages.get(browserType);
      if (!page) return;

      try {
        await page.evaluate(() => document.readyState);
      } catch (error) {
        console.warn(`页面不可用，跳过保存状态: ${browserType}`);
        return;
      }

      const stateDir = path.join(__dirname, '../../profiles', browserType, 'state');
      await fs.mkdir(stateDir, { recursive: true });

      // 保存 cookies（不依赖于页面上下文）
      const cookies = await page.cookies();
      await fs.writeFile(
        path.join(stateDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );

      // 使用 try-catch 分别处理每个存储类型
      try {
        // 保存 localStorage
        const localStorage = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            items[key] = localStorage.getItem(key);
          }
          return items;
        });
        await fs.writeFile(
          path.join(stateDir, 'localStorage.json'),
          JSON.stringify(localStorage, null, 2)
        );
      } catch (error) {
        console.warn(`保存 localStorage 失败: ${browserType}`, error);
      }

      try {
        // 保存 sessionStorage
        const sessionStorage = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            items[key] = sessionStorage.getItem(key);
          }
          return items;
        });
        await fs.writeFile(
          path.join(stateDir, 'sessionStorage.json'),
          JSON.stringify(sessionStorage, null, 2)
        );
      } catch (error) {
        console.warn(`保存 sessionStorage 失败: ${browserType}`, error);
      }

    } catch (error) {
      console.error(`保存浏览器状态失败: ${browserType}`, error);
    }
  }

  async restoreBrowserState(browserType) {
    try {
      const page = this.pages.get(browserType);
      if (!page) return;

      const stateDir = path.join(__dirname, '../../profiles', browserType, 'state');

      // 恢复 cookies
      try {
        const cookiesData = await fs.readFile(path.join(stateDir, 'cookies.json'), 'utf8');
        const cookies = JSON.parse(cookiesData);
        await page.setCookie(...cookies);
      } catch (e) {
        console.log(`没有找到 ${browserType} 的 cookies 数据`);
      }

      // 恢复 localStorage
      try {
        const localStorageData = await fs.readFile(path.join(stateDir, 'localStorage.json'), 'utf8');
        const localStorage = JSON.parse(localStorageData);
        await page.evaluate((data) => {
          localStorage.clear();
          for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value);
          }
        }, localStorage);
      } catch (e) {
        console.log(`没有找到 ${browserType} 的 localStorage 数据`);
      }

      // 恢复 sessionStorage
      try {
        const sessionStorageData = await fs.readFile(path.join(stateDir, 'sessionStorage.json'), 'utf8');
        const sessionStorage = JSON.parse(sessionStorageData);
        await page.evaluate((data) => {
          sessionStorage.clear();
          for (const [key, value] of Object.entries(data)) {
            sessionStorage.setItem(key, value);
          }
        }, sessionStorage);
      } catch (e) {
        console.log(`没有找到 ${browserType} 的 sessionStorage 数据`);
      }

    } catch (error) {
      console.error(`恢复浏览器状态失败: ${browserType}`, error);
    }
  }

  async closeAll() {
    try {
      // 在关闭前尝试最后一次保存状态
      for (const browserType of this.browsers.keys()) {
        try {
          await this.saveBrowserState(browserType);
        } catch (error) {
          console.warn(`关闭前保存状态失败: ${browserType}`, error);
        }
      }

      // 清理防抖函数
      this.saveStateDebounced.clear();

      // 关闭所有浏览器
      const closePromises = Array.from(this.browsers.values()).map(browser => browser.close());
      await Promise.all(closePromises);
      this.browsers.clear();
      this.pages.clear();
    } catch (error) {
      console.error('关闭浏览器时发生错误:', error);
    }
  }

  async applyAntiDetection(page) {
    // 应用所有自定义反检测措施
    await Promise.all([
      customEvasions.hideWebDriver(page),
      customEvasions.emulateMouse(page),
      customEvasions.addPlugins(page),
      customEvasions.emulateChromeRuntime(page),
    ]);

    // 添加更多反检测脚本
    await page.evaluateOnNewDocument(() => {
      // 首先初始化 Notification API
      if (typeof Notification === 'undefined') {
        window.Notification = {
          permission: 'default',
          requestPermission: async function() {
            return 'default';
          },
        };
      }

      // 修改 window.navigator.permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // 模拟完整的权限 API
      const permissionStatus = {
        state: 'prompt',
        addEventListener: function() {},
        removeEventListener: function() {},
        onchange: null,
      };

      const permissions = {
        query: async function() {
          return permissionStatus;
        },
      };

      Object.defineProperty(navigator, 'permissions', {
        value: permissions,
        configurable: false,
      });

      // 添加 window.Notification
      if (!window.Notification) {
        window.Notification = {
          permission: 'default',
          requestPermission: async function() {
            return 'default';
          },
        };
      }

      // 修改 WebGL 指纹
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // 使用更真实的 WebGL 参数
        const gl = this;
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Google Inc. (NVIDIA)';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)';
        }
        return getParameter.apply(gl, arguments);
      };
    });
  }
}

module.exports = BrowserManager; 