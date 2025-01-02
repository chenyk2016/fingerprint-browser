const { execSync } = require('child_process');

function getSystemScreenSize() {
  try {
    if (process.platform === 'win32') {
      // Windows
      const output = execSync('wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution /format:value', { encoding: 'utf8' });
      const lines = output.split('\n');
      const width = parseInt(lines[0].split('=')[1]);
      const height = parseInt(lines[1].split('=')[1]);
      return { width, height };
    } else if (process.platform === 'darwin') {
      // macOS
      try {
        // 使用 Quartz Display Services 获取主显示器的逻辑分辨率
        const output = execSync('osascript -e \'tell application "Finder" to get bounds of window of desktop\'', { encoding: 'utf8' });
        const bounds = output.trim().split(', ').map(Number);
        if (bounds.length === 4) {
          return {
            width: bounds[2],  // 右边界
            height: bounds[3]  // 下边界
          };
        }
      } catch (error) {
        console.warn('无法获取 Finder 窗口尺寸，尝试使用系统配置:', error);
        // 回退到使用 system_profiler
        const output = execSync('system_profiler SPDisplaysDataType | grep Resolution', { encoding: 'utf8' });
        const match = output.match(/(\d+) x (\d+)/);
        if (match) {
          // 考虑 Retina 显示器，将实际分辨率除以 2
          return {
            width: Math.round(parseInt(match[1]) / 2),
            height: Math.round(parseInt(match[2]) / 2)
          };
        }
      }
    } else {
      // Linux
      const output = execSync('xrandr | grep "\\*"', { encoding: 'utf8' });
      const match = output.match(/(\d+)x(\d+)/);
      if (match) {
        return {
          width: parseInt(match[1]),
          height: parseInt(match[2])
        };
      }
    }
  } catch (error) {
    console.warn('无法获取系统屏幕尺寸:', error);
  }

  // 如果无法获取，返回默认值
  return {
    width: 1366,
    height: 768
  };
}

module.exports = {
  getSystemScreenSize
}; 