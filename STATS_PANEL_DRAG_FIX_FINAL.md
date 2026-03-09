# 统计面板拖动问题修复报告

## 问题描述

1. **只能上下拖动，左右拖动没有效果**
2. **拖动时有抖动现象**

---

## 根本原因分析

### 问题 1：左右拖动无效

**错误代码**:
```javascript
// 获取当前 rect（已应用 transform）
const rect = statsPanel.getBoundingClientRect();

// 边界检查
const minX = -rect.left + 10;
const maxX = window.innerWidth - rect.right - 10;  // ❌ 问题在这里！
```

**分析**：
- 面板初始定位是 `right: 20px`（CSS）
- `rect.right` ≈ `window.innerWidth - 20`（接近屏幕右侧）
- `maxX = window.innerWidth - rect.right - 10` ≈ `-10`（很小的负数！）
- 结果：`newOffsetX` 被限制在很小的范围内，无法左右移动

### 问题 2：抖动原因

**错误逻辑**：
```
拖动开始
  ↓
获取 rect（位置A）
  ↓
计算边界 → 应用 transform
  ↓
下次拖动
  ↓
获取 rect（位置B，已改变）❌
  ↓
边界计算基于新位置 → 循环问题 → 抖动
```

---

## 修复方案

### 核心改进

**使用初始位置计算边界，而不是当前位置**

```javascript
// 保存初始位置（仅一次）
let initialRect = null;

function initStatsDrag() {
    // 保存初始位置
    if (!initialRect) {
        initialRect = statsPanel.getBoundingClientRect();
    }
}

function drag(e) {
    // 使用初始位置计算边界
    const initialLeft = initialRect.left;
    const initialRight = initialRect.right;
    
    // 边界计算（固定值，不会变）
    const minOffsetX = -initialLeft + 10;
    const maxOffsetX = window.innerWidth - initialRight - 10;
}
```

### 其他改进

1. **阻止事件冒泡**：
   ```javascript
   e.stopPropagation();
   ```

2. **阻止文本选择**：
   ```javascript
   document.body.style.userSelect = 'none';
   ```

3. **正确的边界逻辑**：
   ```javascript
   // 最左：面板左边缘到达屏幕左边 10px
   minOffsetX = -initialLeft + 10;
   
   // 最右：面板右边缘到达屏幕右边 10px
   maxOffsetX = window.innerWidth - initialRight - 10;
   ```

---

## 修复前后对比

### 修复前
```
问题：使用当前 rect 计算边界
结果：边界值随拖动变化
效果：左右受限 + 抖动
```

### 修复后
```
改进：使用初始 rect 计算边界
结果：边界值固定不变
效果：上下左右自由拖动 + 无抖动
```

---

## 验收测试

| 测试项 | 修复前 | 修复后 |
|-------|--------|--------|
| 左拖动 | ❌ 无效 | ✅ 正常 |
| 右拖动 | ❌ 无效 | ✅ 正常 |
| 上拖动 | ✅ 正常 | ✅ 正常 |
| 下拖动 | ✅ 正常 | ✅ 正常 |
| 抖动 | ❌ 有抖动 | ✅ 无抖动 |
| 面板大小 | ✅ 不变 | ✅ 不变 |
| 鼠标拖动 | ⚠️ 部分正常 | ✅ 正常 |
| 触摸拖动 | ⚠️ 部分正常 | ✅ 正常 |

---

## 代码修改位置

| 位置 | 修改内容 |
|------|---------|
| kanban.html:2625 | 添加 initialRect 变量 |
| kanban.html:2634-2635 | 初始化时保存初始位置 |
| kanban.html:2688-2707 | 使用初始位置计算边界 |
| kanban.html:2646-2657 | 增强 startDrag |
| kanban.html:2719-2728 | 增强 stopDrag |

---

## 技术要点

### Transform 拖动的关键

1. **使用初始位置计算边界**
   - `getBoundingClientRect()` 返回的是 transform 后的位置
   - 必须保存初始位置用于边界计算

2. **增量计算**
   ```javascript
   deltaX = clientX - dragStartPos.x;
   newOffsetX = panelOffset.x + deltaX;
   ```

3. **事件阻止**
   ```javascript
   e.preventDefault();      // 阻止默认行为
   e.stopPropagation();    // 阻止事件冒泡
   ```

---

## 总结

✅ **两个问题都已修复**

### 问题 1：左右拖动无效
- **原因**：边界检查使用了当前 rect，maxX 计算错误
- **修复**：使用初始 rect 计算边界

### 问题 2：抖动现象
- **原因**：rect 随 transform 变化，导致边界计算循环错误
- **修复**：固定使用初始位置计算边界

现在统计面板可以：
- ✅ 上下左右自由拖动
- ✅ 无抖动
- ✅ 面板大小保持不变
- ✅ 鼠标和触摸都正常
