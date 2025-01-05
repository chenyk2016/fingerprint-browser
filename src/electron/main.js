const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 加载应用
    mainWindow.loadURL(`http://localhost:3003`);

    // 开发环境下打开开发者工具
    if (isDev) {
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// 等待应用就绪后创建窗口
app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
}); 