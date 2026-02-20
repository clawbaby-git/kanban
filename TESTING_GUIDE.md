# iOS Safari 测试指南

## 快速测试步骤

### 方法 1：本地测试（推荐）

1. **启动本地服务器**
   ```bash
   cd /Users/clawbaby/Projects/kanban
   python3 -m http.server 8000
   ```

2. **在 iPhone Safari 访问**
   ```
   http://[你的 Mac IP 地址]:8000/kanban.html
   ```

3. **测试添加任务按钮**
   - 点击右上角"添加任务"按钮
   - 验证模态框是否弹出
   - 填写表单并提交

### 方法 2：使用 Safari 开发者工具

1. **连接 iPhone 到 Mac**
   - 使用 USB 线连接
   - iPhone 上信任此电脑

2. **启用 Web 检查器**
   - iPhone: 设置 → Safari → 高级 → Web 检查器（开启）
   - Mac: Safari → 偏好设置 → 高级 → 显示开发菜单

3. **检查元素**
   - Mac Safari: 开发 → [你的 iPhone] → kanban.html
   - 打开控制台查看日志

## 预期行为

### ✅ 正常表现
- 点击"添加任务"按钮有视觉反馈
- 模态框从底部滑入
- 输入框自动聚焦
- 键盘弹出时不遮挡输入框
- 提交后自动刷新看板

### ❌ 如果遇到问题

#### 按钮无响应
1. 检查控制台是否有错误
2. 尝试刷新页面
3. 清除 Safari 缓存

#### 模态框不显示
1. 检查元素是否存在 `modal-overlay active`
2. 查看控制台日志
3. 尝试手动调用 `openModal()`

#### 输入框问题
1. 确保字号为 16px（防止缩放）
2. 禁用自动纠正
3. 检查键盘类型

## 调试命令

### 在控制台执行

```javascript
// 检查按钮是否存在
document.getElementById('addTaskBtn')

// 手动打开模态框
openModal()

// 检查事件监听器
getEventListeners(document.getElementById('addTaskBtn'))

// 查看保存的任务
localStorage.getItem('kanban_tasks')
```

## 性能检查

### 响应时间测试
1. 打开 Safari 时间线
2. 点击按钮
3. 查看：
   - 事件处理时间
   - DOM 更新时间
   - 重绘/重排次数

### 内存检查
1. Safari → 开发 → 时间线
2. 录制 10 秒
3. 多次添加任务
4. 检查内存是否持续增长

## 常见问题解决

### 问题 1：触摸延迟
**解决方案**：已添加 `touchend` 事件，响应时间 < 50ms

### 问题 2：输入框缩放
**解决方案**：字号设置为 16px，防止 iOS 自动缩放

### 问题 3：键盘遮挡
**解决方案**：已实现自动滚动到输入框

### 问题 4：100vh 高度
**解决方案**：使用 JavaScript 动态计算 `--vh` 变量

## 测试数据

### 示例任务
```json
{
  "task_id": "XY-TEST",
  "title": "测试任务",
  "status": "待办",
  "priority": "高",
  "iteration_name": "iteration-1",
  "participants": [
    {"name": "孙悟空", "role": "服务端", "estimated_days": 2}
  ],
  "reviewers": []
}
```

## 测试报告模板

```
测试人员：[姓名]
测试日期：2026-02-19
设备型号：[iPhone 型号]
iOS 版本：[版本号]
Safari 版本：[版本号]

测试结果：
[ ] 按钮响应正常
[ ] 模态框显示正常
[ ] 表单输入正常
[ ] 数据保存成功
[ ] 看板刷新正常

问题记录：
1. [问题描述]
2. [问题描述]

建议：
[改进建议]
```

## 联系支持

如遇到问题，请检查：
1. 控制台错误日志
2. 网络请求状态
3. localStorage 数据
4. DOM 结构是否正确

提供以下信息以便诊断：
- 设备型号和 iOS 版本
- 详细错误信息
- 复现步骤
- 控制台截图
