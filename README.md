# Kanban 看板项目

现代化任务管理看板应用，支持响应式设计和 GitHub Pages 部署。

## 功能特性

### 核心功能
- ✅ **添加任务**: 响应式模态框，支持输入验证
- ✅ **任务管理**: 待办/进行中/已完成三列管理
- ✅ **任务筛选**: 按优先级筛选（高/中/低）
- ✅ **实时搜索**: 任务标题实时搜索
- ✅ **统计面板**: 总任务数、总工时、完成率

### 存储方案
- **Session Storage**: 数据在会话期间有效，刷新页面不丢失
- **无服务器存储**: 适合 GitHub Pages 静态部署

### 兼容性
- ✅ iOS Safari 完美支持
- ✅ 触摸事件优化
- ✅ 响应式设计（适配各种屏幕尺寸）
- ✅ 弹性滚动支持

## 技术栈

- **原生 HTML/CSS/JavaScript**: 无框架依赖，轻量级
- **Session Storage**: 现代浏览器存储 API
- **响应式设计**: CSS Grid + Flexbox
- **iOS Safari 优化**: 触摸事件和弹性滚动

## 部署方案

### GitHub Pages 部署

**准备工作**:
1. 创建 GitHub 仓库
2. 配置 GitHub Pages 设置
3. 部署项目文件

**部署脚本**:
```bash
# 部署到 GitHub Pages
git add .
git commit -m "feat: 完成添加任务功能和响应式优化"
git push origin main
```

### 本地开发

```bash
# 启动本地服务器
python3 -m http.server 8889
# 访问 http://localhost:8889/kanban.html
```

## 版本历史

### v0.4.0 (2026-02-20)
- ✅ 添加任务功能（响应式模态框）
- ✅ Session Storage 存储方案
- ✅ 统计面板优化
- ✅ 滚动体验改进
- ✅ iOS Safari 兼容性优化

### v0.3.0 (2026-02-19)
- ✅ 基础看板功能
- ✅ 任务筛选和搜索
- ✅ 响应式布局

## 开发说明

### 文件结构
```
kanban/
├── kanban.html          # 主应用文件
├── README.md           # 项目说明
├── docs/               # 文档目录
│   └── mvp-plan.md     # MVP 迭代计划
└── data/               # 数据目录
    └── tasks.json      # 任务数据
```

### 开发工具
- **OpenCode**: AI 辅助开发
- **VSCode**: 代码编辑
- **Git**: 版本控制

## 许可证

MIT License
