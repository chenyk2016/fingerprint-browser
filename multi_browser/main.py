from browsers.browser_manager import BrowserManager
from config.browser_config import BROWSER_CONFIGS

def main():
    # 创建浏览器管理器实例
    browser_manager = BrowserManager()
    
    try:
        # 启动不同的浏览器
        for browser_type, config in BROWSER_CONFIGS.items():
            print(f"正在启动 {config['name']}...")
            driver = browser_manager.launch_browser(
                browser_type,
                config['options']
            )
            # 访问测试网页
            driver.get('https://www.example.com')
            
        # 等待用户输入后关闭所有浏览器
        input("按回车键关闭所有浏览器...")
    
    finally:
        # 确保所有浏览器都被关闭
        browser_manager.close_all()

if __name__ == "__main__":
    main() 