const path = require('path');

const browserConfigs = {
  chrome: {
    name: 'Chrome',
    options: {
      headless: false,
      defaultViewport: null,
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
      webgl: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)',
      },
      audio: {
        sampleRate: 44100,
        channels: 2,
      }
    }
  },
  // firefox: {
  //   name: 'Firefox',
  //   options: {
  //     product: 'firefox',
  //     headless: false,
  //     defaultViewport: null,
  //     args: [
  //       '--start-maximized',
  //       '--disable-notifications'
  //     ],
  //     userDataDir: path.join(__dirname, '../../profiles/firefox'),
  //   }
  // }
};

module.exports = browserConfigs; 