# 开发指引

## 浏览器操作

### 打开页面
browser(action=open, targetUrl="http://...")

### 截图
browser(action=screenshot)

### 完整页面截图
browser(action=screenshot, fullPage=true)

### 指定区域截图
browser(action=screenshot, selector=".chart-container")

### 关闭页面
browser(action=close)

## 常用选择器

- 图表区域: `.chart-container`
- 统计面板: `.stats-panel`
- 看板容器: `.board-container`
- 任务卡片: `.task-card`
