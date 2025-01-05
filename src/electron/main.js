const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 设置默认环境变量
const DEFAULT_NODE_ENV = 'production';
process.env.NODE_ENV = process.env.NODE_ENV || DEFAULT_NODE_ENV;

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';
const isPreview = process.env.NODE_ENV === 'preview';
const isProd = !isDev && !isPreview;

// 创建日志目录
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 设置日志文件
const logFile = path.join(logDir, 'electron.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
}

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.stack || error}`);
    showError('Uncaught Exception', error);
});

process.on('unhandledRejection', (error) => {
    log(`Unhandled Rejection: ${error.stack || error}`);
    showError('Unhandled Rejection', error);
});

log('Application starting...');
log(`NODE_ENV: ${process.env.NODE_ENV}`);
log(`App path: ${app.getAppPath()}`);
log(`Resource path: ${process.resourcesPath || 'Not available'}`);
log(`Current working directory: ${process.cwd()}`);

// 获取正确的资源路径
function getResourcePath(relativePath) {
    let fullPath;
    if (isProd) {
        if (!process.resourcesPath) {
            log('Error: Resource path not available in production');
            throw new Error('Resource path not available in production');
        }
        fullPath = path.join(process.resourcesPath, 'app.asar', relativePath);
        log(`Production path: ${fullPath}`);
    } else {
        fullPath = path.join(process.cwd(), relativePath);
        log(`Development path: ${fullPath}`);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
        log(`File not found: ${fullPath}`);
        throw new Error(`File not found: ${fullPath}`);
    }

    // 验证文件权限
    try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        log(`File is readable: ${fullPath}`);
    } catch (error) {
        log(`File permission error: ${fullPath}`);
        throw new Error(`No read permission for file: ${fullPath}`);
    }
    
    return fullPath;
}

// 显示错误对话框
function showError(title, error) {
    const errorMessage = error.stack || error.toString();
    log(`ERROR - ${title}: ${errorMessage}`);
    
    // 确保有窗口显示错误
    if (!mainWindow) {
        createWindow();
    }
    
    dialog.showErrorBox(title, errorMessage);
}

// 启动内置server
async function startServer() {
    if (isDev) {
        log('Development mode - skipping internal server start');
        return;
    }
    
    try {
        log('Starting internal server...');
        const serverPath = getResourcePath('dist/server/server.js');
        log(`Loading server from: ${serverPath}`);
        
        // 验证服务器文件
        try {
            require.resolve(serverPath);
            log('Server module resolved successfully');
        } catch (error) {
            log(`Server module resolution failed: ${error}`);
            throw new Error(`Failed to resolve server module: ${error.message}`);
        }
        
        const server = require(serverPath);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const error = new Error('Server start timeout after 30s');
                log(error.message);
                reject(error);
            }, 30000);

            let retryCount = 0;
            const maxRetries = 10;
            
            const checkServer = () => {
                retryCount++;
                log(`Checking server status (attempt ${retryCount}/${maxRetries})...`);
                
                if (retryCount > maxRetries) {
                    clearTimeout(timeout);
                    const error = new Error('Max retry attempts reached');
                    log(error.message);
                    reject(error);
                    return;
                }

                require('http').get('http://localhost:45813', (res) => {
                    if (res.statusCode === 200) {
                        clearTimeout(timeout);
                        log('Server started successfully');
                        resolve();
                    } else {
                        log(`Server returned status: ${res.statusCode}`);
                        setTimeout(checkServer, 1000);
                    }
                }).on('error', (err) => {
                    log(`Server check error: ${err.code}`);
                    if (err.code === 'ECONNREFUSED') {
                        setTimeout(checkServer, 1000);
                    } else {
                        clearTimeout(timeout);
                        reject(err);
                    }
                });
            };
            checkServer();
        });
    } catch (error) {
        log(`Server start error: ${error.stack || error}`);
        showError('Server Start Error', error);
        // 在生产环境中保持应用运行一段时间以显示错误
        if (isProd) {
            return new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
}

function createWindow() {
    try {
        log('Creating main window...');
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false, // 先创建窗口但不显示
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // 窗口准备好再显示
        mainWindow.once('ready-to-show', () => {
            log('Window ready to show');
            mainWindow.show();
        });

        log('Loading application URL...');
        mainWindow.loadURL(`http://localhost:45813`).catch(error => {
            log(`Failed to load URL: ${error.stack || error}`);
            showError('Failed to load application', error);
        });

        if (isDev || isPreview) {
            log('Opening DevTools');
            mainWindow.webContents.openDevTools();
        }

        mainWindow.on('closed', function () {
            log('Main window closed');
            mainWindow = null;
        });
    } catch (error) {
        log(`Window creation error: ${error.stack || error}`);
        showError('Window Creation Error', error);
    }
}

// 等待应用就绪后启动server和创建窗口
app.whenReady().then(async () => {
    try {
        log('Application ready, starting server...');
        await startServer();
        log('Creating window...');
        createWindow();
    } catch (error) {
        log(`Startup error: ${error.stack || error}`);
        showError('Application Start Error', error);
    }
});

app.on('window-all-closed', function () {
    log('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    log('App activated');
    if (mainWindow === null) {
        createWindow();
    }
}); 