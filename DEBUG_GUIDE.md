# 添加任务 DOM 更新问题诊断指南

## 问题描述
添加任务后，看板上没有显示新任务，模态框能正常操作但 DOM 没有刷新。

## 已添加调试日志
我已在代码中添加了详细的调试日志，请按以下步骤查看：

### 方法 1：桌面浏览器调试

1. **打开开发者工具**
   - Chrome: F12 或 Cmd+Option+I (Mac)
   - Firefox: F12 或 Cmd+Option+I (Mac)
   - Safari: Cmd+Option+C (需先启用开发菜单)

2. **切换到 Console 标签**

3. **执行添加任务操作**
   - 点击"添加任务"按钮
   - 填写表单并提交

4. **查看控制台输出**
   应该看到以下日志：
   ```
   📝 新任务: {...}
   ✅ 任务已添加到内存，当前任务数: X
   🔄 renderBoard 被调用
   📊 筛选后任务数: X
   📋 各状态任务数: {待办: X, 进行中: X, 已完成: X}
   🎯 渲染任务列表: todo-list, 状态: 待办, 任务数: X
   ✅ 任务列表渲染完成: todo-list
   ✅ 看板渲染完成
   ```

### 方法 2：iOS Safari 调试

1. **连接 iPhone 到 Mac**
   - 使用 USB 线连接

2. **启用 Web 检查器**
   - iPhone: 设置 → Safari → 高级 → Web 检查器（开启）
   - Mac: Safari → 偏好设置 → 高级 → 显示开发菜单

3. **打开 Safari 开发者工具**
   - Mac Safari: 开发 → [你的 iPhone] → kanban.html
   - 打开控制台

4. **执行添加任务操作并查看日志**

## 常见问题诊断

### 问题 1：看不到任何日志
**可能原因**：
- JavaScript 文件加载失败
- 浏览器缓存问题

**解决方法**：
```javascript
// 在控制台执行
console.log('测试控制台');
```

### 问题 2：看到 "任务已添加到内存" 但没有后续日志
**可能原因**：
- renderBoard() 函数未执行
- 有 JavaScript 错误

**解决方法**：
```javascript
// 检查 state.allTasks
console.log('当前任务数:', state.allTasks.length);
console.log('所有任务:', state.allTasks);

// 手动调用 renderBoard
renderBoard();
```

### 问题 3：看到 "筛选后任务数: 0"
**可能原因**：
- filterTasks() 函数有问题
- state.searchQuery 或 state.currentFilter 有值

**解决方法**：
```javascript
// 检查筛选条件
console.log('搜索查询:', state.searchQuery);
console.log('当前筛选:', state.currentFilter);

// 重置筛选
state.searchQuery = '';
state.currentFilter = 'all';
renderBoard();
```

### 问题 4：看到 "各状态任务数: {待办: 0, 进行中: 0, 已完成: 0}"
**可能原因**：
- 任务状态不匹配
- groupByStatus() 函数有问题

**解决方法**：
```javascript
// 检查任务状态
console.log('最后一个任务:', state.allTasks[state.allTasks.length - 1]);
```

### 问题 5：看到 "未找到容器: todo-list"
**可能原因**：
- HTML 元素未加载
- 元素 ID 错误

**解决方法**：
```javascript
// 检查元素是否存在
console.log('todo-list 元素:', document.getElementById('todo-list'));
console.log('所有列:', document.querySelectorAll('.column'));
```

### 问题 6：看到 "任务列表渲染完成" 但看板上没有显示
**可能原因**：
- DOM 更新被阻止
- CSS 隐藏了元素

**解决方法**：
```javascript
// 检查元素内容
const container = document.getElementById('todo-list');
console.log('容器内容:', container.innerHTML);
console.log('容器样式:', window.getComputedStyle(container).display);
```

## 手动测试命令

在浏览器控制台执行以下命令：

### 1. 检查状态
```javascript
// 查看所有任务
console.table(state.allTasks);

// 查看筛选后的任务
console.table(state.filteredTasks);

// 查看当前视图和筛选
console.log('当前视图:', state.currentView);
console.log('当前筛选:', state.currentFilter);
console.log('搜索查询:', state.searchQuery);
```

### 2. 手动添加任务
```javascript
// 添加一个测试任务
const testTask = {
    task_id: 'TEST-001',
    title: '测试任务',
    status: '待办',
    priority: '高',
    iteration_name: 'iteration-1',
    participants: [],
    reviewers: []
};

state.allTasks.push(testTask);
renderBoard();
```

### 3. 手动刷新看板
```javascript
renderBoard();
```

### 4. 重置所有筛选
```javascript
state.searchQuery = '';
state.currentFilter = 'all';
state.currentView = 'list';
renderBoard();
```

## 检查 DOM 结构

### 1. 检查任务列表容器
```javascript
// 检查待办列
const todoList = document.getElementById('todo-list');
console.log('待办列内容:', todoList.innerHTML);
console.log('待办列子元素数:', todoList.children.length);

// 检查进行中列
const progressList = document.getElementById('progress-list');
console.log('进行中列内容:', progressList.innerHTML);

// 检查已完成列
const doneList = document.getElementById('done-list');
console.log('已完成列内容:', doneList.innerHTML);
```

### 2. 检查任务卡片
```javascript
// 查找所有任务卡片
const cards = document.querySelectorAll('.task-card');
console.log('任务卡片数量:', cards.length);

// 查看最后一个任务卡片
if (cards.length > 0) {
    console.log('最后一个任务卡片:', cards[cards.length - 1]);
}
```

## 预期行为

添加任务后应该看到：
1. ✅ Toast 提示："任务添加成功！（仅在当前会话显示）"
2. ✅ 模态框关闭
3. ✅ 看板显示新任务卡片
4. ✅ 任务数量统计更新

## 如果问题仍然存在

请提供以下信息：
1. 浏览器控制台的完整日志（截图）
2. 浏览器类型和版本
3. 操作系统
4. 具体操作步骤

## 临时解决方案

如果看板没有自动刷新，可以尝试：
1. 点击"全部"筛选按钮
2. 切换视图（列表/分组）
3. 刷新页面（会丢失添加的任务）

## 联系方式

如有问题，请提供：
- 控制台日志截图
- 浏览器信息
- 操作步骤视频或截图
