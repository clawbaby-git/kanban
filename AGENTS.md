# 看板项目开发规范

## Opencode 任务管理

### 方案 3：process 工具轮询（当前使用）

启动 opencode 任务后，在当前会话中用 `process(action=poll)` 定期检查（每 1-2 分钟），完成时主动通知，不设置 cron（避免上下文问题）。

### 操作流程

1. 用 `exec(..., background=true, yieldMs=3000)` 启动 opencode
2. 立即用 `process(action=poll, sessionId=...)` 检查状态
3. 每 1-2 分钟轮询一次
4. 任务完成时主动汇报结果
5. 不需要设置 cron

## 开发阶段

### MVP 迭代计划

- MVP 0: 基础架构 ✅
- MVP 1: 数据查看器 ✅
- MVP 2: 核心看板 ✅
- MVP 3: 添加任务 ✅
- MVP 6: 任务详情 ✅
- MVP 7: ~~燃尽图~~（已移除）

## 工具使用

### 浏览器操作

- 打开页面: `browser(action=open, targetUrl="http://...")`
- 截图: `browser(action=screenshot)`
- 完整页面截图: `browser(action=screenshot, fullPage=true)`
- 指定区域截图: `browser(action=screenshot, selector=".chart-container")`
- 关闭页面: `browser(action=close)`

### 常用选择器

- 图表区域: `.chart-container`
- 统计面板: `.stats-panel`
- 看板容器: `.board-container`
- 任务卡片: `.task-card`
