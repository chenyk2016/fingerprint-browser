require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  CHROME_PATH: process.env.CHROME_PATH,
  DEBUG: process.env.DEBUG === 'true',
  // ... 其他环境变量
}; 