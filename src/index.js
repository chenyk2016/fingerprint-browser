const BrowserManager = require('./browsers/browser-manager');
const browserConfigs = require('./config/browser-config');

let browserManager = null;

async function cleanup() {
  if (browserManager) {
    console.log('\n正在关闭浏览器...');
    try {
      await browserManager.closeAll();
    } catch (error) {
      console.error('关闭浏览器时出错:', error);
    }
  }
  process.exit(0);
}

// 处理进程信号
process.on('SIGINT', cleanup);  // Ctrl+C
process.on('SIGTERM', cleanup); // kill
process.on('SIGUSR2', cleanup); // nodemon restart

async function main() {
  browserManager = new BrowserManager();

  // 添加进程异常处理
  process.on('uncaughtException', async (error) => {
    console.error('未捕获的异常:', error);
    await cleanup();
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    await cleanup();
  });

  try {
    // 检查配置是否为空
    if (Object.keys(browserConfigs).length === 0) {
      throw new Error('浏览器配置为空');
    }

    for (const [browserType, config] of Object.entries(browserConfigs)) {
      // 验证必要的配置字段
      if (!config.name || !config.options) {
        throw new Error(`浏览器 ${browserType} 的配置无效`);
      }

      console.log(`正在启动 ${config.name}...`);
      const { page } = await browserManager.launchBrowser(
        browserType, 
        config.options,
        config.fingerprint
      );

      if (!page) {
        throw new Error(`浏览器 ${browserType} 页面创建失败`);
      }
      
      await browserManager.restoreBrowserState(browserType);
      
      // 设置页面超时
      await page.setDefaultNavigationTimeout(30000);
      await page.setDefaultTimeout(30000);

      // 打开百度
      console.log('正在打开百度...');
      try {
        await page.goto('https://www.baidu.com', {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        console.log('百度页面加载完成');
      } catch (error) {
        console.error('打开百度失败:', error);
      }
      
      // 测试指纹
      // await page.goto('https://browserleaks.com/javascript');
      // 或者其他指纹检测网站
      // await page.goto('https://amiunique.org/');
      // await page.goto('https://coveryourtracks.eff.org/');
    }

    console.log('浏览器启动完成');
    console.log('按 Ctrl+C 关闭所有浏览器...');

  } catch (error) {
    console.error('发生错误:', error);
    await cleanup();
  }
}

main().catch(error => {
  console.error('主程序异常:', error);
  cleanup();
}); 