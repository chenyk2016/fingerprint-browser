import path from 'path';
import { getSystemScreenSize } from '../utils/system-info';
import { BrowserConfig } from '../types/browser';

interface ScreenSize {
  width: number;
  height: number;
}

interface BrowserFingerprint {
  navigator: {
    userAgent: string;
    platform: string;
    language: string;
    languages: string[];
    hardwareConcurrency: number;
    deviceMemory: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
  };
  webgl: {
    vendor: string;
    renderer: string;
  };
  audio: {
    sampleRate: number;
    channels: number;
  };
}

interface ExtendedBrowserConfig extends BrowserConfig {
  fingerprint?: BrowserFingerprint;
}

// 获取系统屏幕尺寸
const screenSize: ScreenSize = getSystemScreenSize();
console.log('系统屏幕尺寸:', screenSize);

const browserConfigs: Record<string, ExtendedBrowserConfig> = {
  chrome: {
    name: 'Chrome',
    options: {
      headless: false,
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
        '--lang=zh-CN'
      ],
      userDataDir: path.join(__dirname, '../../profiles/chrome'),
    },
    fingerprint: {
      navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'Win32',
        language: 'zh-CN',
        languages: ['zh-CN', 'zh', 'en-US'],
        hardwareConcurrency: 8,
        deviceMemory: 8,
      },
      screen: {
        width: screenSize.width,
        height: screenSize.height,
        colorDepth: 24,
        pixelDepth: 24,
      },
      webgl: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)',
      },
      audio: {
        sampleRate: 44100,
        channels: 2,
      }
    }
  }
};

export default browserConfigs; 