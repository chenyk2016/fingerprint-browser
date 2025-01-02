from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.edge.service import Service as EdgeService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from webdriver_manager.microsoft import EdgeChromiumDriverManager

class BrowserManager:
    def __init__(self):
        self.drivers = {}
    
    def launch_browser(self, browser_type, options=None):
        """
        启动指定类型的浏览器
        """
        if browser_type == 'chrome':
            chrome_options = webdriver.ChromeOptions()
            if options:
                for option in options:
                    chrome_options.add_argument(option)
            driver = webdriver.Chrome(
                service=ChromeService(ChromeDriverManager().install()),
                options=chrome_options
            )
            self.drivers['chrome'] = driver
            
        elif browser_type == 'firefox':
            firefox_options = webdriver.FirefoxOptions()
            if options:
                for option in options:
                    firefox_options.add_argument(option)
            driver = webdriver.Firefox(
                service=FirefoxService(GeckoDriverManager().install()),
                options=firefox_options
            )
            self.drivers['firefox'] = driver
            
        elif browser_type == 'edge':
            edge_options = webdriver.EdgeOptions()
            if options:
                for option in options:
                    edge_options.add_argument(option)
            driver = webdriver.Edge(
                service=EdgeService(EdgeChromiumDriverManager().install()),
                options=edge_options
            )
            self.drivers['edge'] = driver
            
        else:
            raise ValueError(f"不支持的浏览器类型: {browser_type}")
        
        return driver
    
    def close_all(self):
        """
        关闭所有浏览器
        """
        for driver in self.drivers.values():
            driver.quit()
        self.drivers.clear() 