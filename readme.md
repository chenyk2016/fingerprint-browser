# fingerprint-browser

一个强大的多浏览器环境管理工具,专注于浏览器指纹管理、状态保存和反检测功能。

⚠️废弃，有需要的可以看(https://github.com/chenyk2016/Browser-Manager)

## 🚀 特性

### 浏览器管理
- 多浏览器实例并行管理
- 浏览器生命周期控制
- 内存和资源优化
- 事件驱动的状态监控

### 指纹管理
- Navigator 属性定制
- WebGL 参数自定义
- Canvas 指纹处理
- 音频指纹处理
- 浏览器特征管理

### 状态控制
- Cookie 管理
- LocalStorage 数据持久化
- SessionStorage 数据
- 浏览器状态自动保存
- 用户会话管理

### 反检测机制
- WebDriver 标记隐藏
- 自动化特征消除
- 插件模拟
- 权限 API 模拟
- 指纹一致性保护

## 🛠 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Express + Node.js
- **自动化**: Puppeteer + Puppeteer Stealth
- **桌面**: Electron
- **工具链**: Vite + TypeScript

## 📦 安装

```bash
# 安装依赖
npm install

# 开发模式
npm run electron:dev

# 构建应用
npm run package
```

## 🔧 系统要求

- **Node.js**: 16.x 或更高
- **内存**: 4GB 或更多
- **操作系统**: 
  - Windows 10/11
  - macOS 10.15+
  - Linux (Ubuntu 20.04+)

## 💻 开发指南

### 项目结构
```
src/
├── browsers/       # 浏览器管理核心
├── config/         # 配置文件
├── electron/       # Electron 主进程
├── client/         # React 前端
├── middleware/     # Express 中间件
├── routes/         # API 路由
├── types/          # TypeScript 类型
└── utils/          # 工具函数
```

### 开发命令
```bash
# 启动开发服务器
npm run server:dev

# 启动前端开发
npm run client:dev

# 类型检查
npm run type-check

# 构建
npm run build
```

## 🔐 安全建议

1. **环境安全**
   - 避免使用 `--no-sandbox` 参数
   - 及时更新依赖包
   - 使用环境变量管理敏感信息

2. **数据安全**
   - 加密存储敏感数据
   - 定期清理临时文件
   - 实现会话超时机制

## 📈 性能优化

1. **资源管理**
   - 浏览器实例池化
   - 自动内存回收
   - 资源使用监控

2. **并发控制**
   - 限制最大并发数
   - 智能任务队列
   - 负载均衡

## 🐛 故障排除

1. **启动问题**
   - 检查 Chrome 安装状态
   - 验证用户权限
   - 查看错误日志

2. **性能问题**
   - 监控内存使用
   - 检查并发数量
   - 优化资源配置

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

