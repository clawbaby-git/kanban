# Session Storage 存储方案说明

## 方案特点

### Session Storage 优势
✅ **会话期间有效** - 数据在浏览器标签页打开期间一直保留
✅ **自动清除** - 关闭标签页后数据自动清除
✅ **独立隔离** - 每个标签页有独立的存储空间
✅ **临时任务管理** - 适合临时任务规划和管理
✅ **无污染** - 不会污染用户的持久存储

### 与 LocalStorage 对比

| 特性 | Session Storage | Local Storage |
|------|----------------|---------------|
| 生命周期 | 标签页会话期间 | 永久 |
| 关闭标签页 | 自动清除 | 保留 |
| 标签页隔离 | ✅ 独立 | ❌ 共享 |
| 存储容量 | ~5MB | ~5MB |
| 适用场景 | 临时数据 | 持久数据 |

## 使用场景

### ✅ 适合场景
- 临时任务规划
- 会议任务记录
- 演示和测试
- 一次性项目管理
- 不需要长期保存的任务

### ❌ 不适合场景
- 长期项目跟踪
- 团队协作
- 需要历史记录
- 跨设备同步

## 功能说明

### 添加任务
1. 点击"添加任务"按钮
2. 填写表单信息
3. 提交后任务立即显示
4. 数据保存到 Session Storage

### 查看任务
- 任务在看板中实时显示
- 支持搜索和筛选
- 支持列表和分组视图

### 导出数据
- 点击"导出"按钮
- 自动下载 tasks.json 文件
- 可手动保存到项目目录

### 清空数据
- 点击"清空"按钮
- 确认后清空所有会话数据
- 刷新页面恢复原始数据

## 数据流程

```
打开页面
  ↓
检查 Session Storage
  ↓
有数据？ → 是 → 加载会话数据
  ↓否
从服务器加载原始数据
  ↓
保存到 Session Storage
  ↓
用户添加/修改任务
  ↓
保存到 Session Storage
  ↓
关闭标签页
  ↓
自动清除数据
```

## 技术实现

### 存储函数
```javascript
// 保存任务
function saveTasks() {
    const tasksData = { tasks: state.allTasks };
    sessionStorage.setItem('kanban_tasks', JSON.stringify(tasksData));
}

// 加载任务
async function loadTasks() {
    const savedTasks = sessionStorage.getItem('kanban_tasks');
    if (savedTasks) {
        const data = JSON.parse(savedTasks);
        state.allTasks = data.tasks || [];
    } else {
        // 从服务器加载原始数据
        const response = await fetch('data/projects/xiyouji/tasks.json');
        const data = await response.json();
        state.allTasks = data.tasks || [];
        // 保存到 Session Storage
        sessionStorage.setItem('kanban_tasks', JSON.stringify({ tasks: state.allTasks }));
    }
}

// 清空数据
function clearSessionData() {
    sessionStorage.removeItem('kanban_tasks');
    location.reload();
}
```

## 浏览器兼容性

### 支持情况
- ✅ Chrome 4+
- ✅ Firefox 3.5+
- ✅ Safari 4+
- ✅ iOS Safari 3.2+
- ✅ Android Browser 2.1+

### 容量限制
- 大多数浏览器：~5MB
- 足够存储数千个任务

## GitHub Pages 部署

### 优势
1. **无需后端** - 纯前端实现
2. **免费托管** - GitHub Pages 免费
3. **自动部署** - 推送代码自动更新
4. **HTTPS 安全** - 自动 HTTPS 证书

### 部署步骤
1. 上传代码到 GitHub 仓库
2. 开启 GitHub Pages
3. 选择分支和目录
4. 访问部署的 URL

### 注意事项
- Session Storage 与域名绑定
- 不同域名的数据不共享
- HTTPS 和 HTTP 的数据隔离

## 最佳实践

### 数据备份
- 定期导出重要任务
- 保存到本地文件
- 使用版本控制

### 数据迁移
如需迁移到持久化存储：
1. 点击"导出"按钮
2. 下载 tasks.json
3. 手动替换项目文件
4. 或修改代码使用 Local Storage

### 性能优化
- 避免存储大量数据
- 定期清理无用任务
- 使用分页显示

## 常见问题

### Q1: 刷新页面数据会丢失吗？
**A**: 不会。刷新页面数据仍然保留，只有在关闭标签页后才会清除。

### Q2: 打开多个标签页会共享数据吗？
**A**: 不会。每个标签页有独立的 Session Storage，数据不共享。

### Q3: 如何持久化数据？
**A**: 点击"导出"按钮，下载 tasks.json 文件保存到本地。

### Q4: 数据存储在哪里？
**A**: 数据存储在浏览器的 Session Storage 中，不在服务器上。

### Q5: 数据有大小限制吗？
**A**: 大多数浏览器限制为 ~5MB，足够存储数千个任务。

## 未来扩展

### 持久化存储方案
1. **Local Storage** - 长期保存数据
2. **IndexedDB** - 大量数据存储
3. **后端 API** - 云端同步
4. **GitHub API** - 直接修改仓库文件

### 可选功能
- [ ] 自动备份到云端
- [ ] 数据导入功能
- [ ] 团队协作功能
- [ ] 数据统计和分析

## 代码位置

| 功能 | 文件位置 | 说明 |
|------|---------|------|
| 存储函数 | kanban.html:1972-2020 | saveTasks(), loadTasks() |
| 清空函数 | kanban.html:2004-2010 | clearSessionData() |
| 导出函数 | kanban.html:2012-2024 | exportTasks() |
| 按钮样式 | kanban.html:178-210 | CSS 样式 |

## 总结

Session Storage 方案适合临时任务管理：
- ✅ 会话期间数据持久化
- ✅ 关闭标签页自动清除
- ✅ 无需后端服务器
- ✅ 适合 GitHub Pages 部署
- ✅ iOS Safari 兼容性良好

如有持久化需求，可随时导出数据或升级存储方案。
