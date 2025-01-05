import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// electron 类型定义
type ElectronPathName = 
  | 'home' 
  | 'appData' 
  | 'userData' 
  | 'sessionData' 
  | 'temp' 
  | 'exe' 
  | 'module' 
  | 'desktop' 
  | 'documents' 
  | 'downloads' 
  | 'music' 
  | 'pictures' 
  | 'videos' 
  | 'recent' 
  | 'logs' 
  | 'crashDumps';

type ElectronApp = {
  getPath: (name: ElectronPathName) => string;
};

// 尝试导入electron
let electronApp: ElectronApp | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron');
  electronApp = electron.app as ElectronApp;
} catch (error: unknown) {
  console.log('Electron app module not available, using fallback paths');
  electronApp = null;
}

// 环境变量
const isDev = process.env.NODE_ENV === 'development';
const isPreview = process.env.NODE_ENV === 'preview';

// 获取用户数据目录
function getUserDataPath(relativePath: string): string {
  if (isDev || isPreview) {
    // 开发环境：使用项目根目录下的临时目录
    return path.join(__dirname, '../..', 'temp', relativePath);
  }

  // 生产环境：使用electron的userData目录或系统默认目录
  const userDataPath = electronApp?.getPath('userData') || 
    (process.platform === 'darwin' ? 
      path.join(process.env.HOME || '', 'Library/Application Support/multi-browser') : 
      path.join(process.env.APPDATA || '/var/local', 'multi-browser'));
  
  return path.join(userDataPath, relativePath);
}

// 配置对象
export const config = {
  // 环境
  isDev,
  isPreview,
  isProd: !isDev && !isPreview,
  
  // 服务器配置
  port: process.env.PORT || 45813,
  
  // 路径配置
  clientPath: isDev 
    ? path.join(__dirname, '../..', 'src/client')
    : path.join(__dirname, '../..', 'client'),
  
  // 数据目录
  dataDir: getUserDataPath('data'),
  profilesDir: getUserDataPath('profiles'),
  configFile: getUserDataPath('data/browser-configs.json'),

  // 获取用户数据目录的辅助函数
  getUserDataPath
}; 