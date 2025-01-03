const fs = require('fs-extra');
const path = require('path');
const pkg = require('../package.json');
const { execSync } = require('child_process');
const os = require('os');

async function packageApp() {
    const distPath = path.join(__dirname, '../dist-app');
    const serverDist = path.join(__dirname, '../dist');
    const executablePath = path.join(distPath, 'executable');

    // 确定当前平台
    const platform = os.platform();
    
    // Clean dist directory
    await fs.remove(distPath);
    await fs.ensureDir(distPath);
    await fs.ensureDir(executablePath);

    // Copy necessary files
    await fs.copy(serverDist, path.join(distPath, 'dist'));
    
    // Create start script with proper require paths
    const startScript = `
const path = require('path');
const serverPath = path.join(__dirname, 'dist', 'server.js');
require(serverPath);
    `.trim();

    const startScriptPath = path.join(distPath, 'start.js');
    await fs.writeFile(startScriptPath, startScript);
    await fs.chmod(startScriptPath, '755');

    // 设置环境变量使用国内镜像
    const env = {
        ...process.env,
        NEXE_CACHE: path.join(process.env.HOME || process.env.USERPROFILE, '.nexe'),
        NEXE_REMOTE: 'https://npmmirror.com/mirrors/node'
    };

    // 构建可执行文件
    console.log('Creating executable...');
    const outputName = platform === 'win32' ? 'multi-browser.exe' : 'multi-browser';
    const nexeCmd = `npx nexe start.js -o "${path.join('executable', outputName)}" --build --target "macos-x64-14.15.3" --resource "dist/**/*"`;
    
    execSync(nexeCmd, {
        cwd: distPath,
        stdio: 'inherit',
        env
    });

    console.log('Package created successfully in dist-app/executable directory');
    console.log(`Available executable:`, path.join('dist-app/executable', outputName));
}

packageApp().catch(console.error); 