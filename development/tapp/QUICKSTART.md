# Tapp 快速入门

Tapp (Third-party App) 是 Myriad 的扩展应用系统，允许开发者创建自定义小组件、工具和功能扩展。

## 5 分钟创建你的第一个 Tapp

### 1. 创建 Manifest

每个 Tapp 都需要一个 Manifest 配置文件：

```json
{
  "id": "com.example.my-tapp",
  "name": "我的应用",
  "version": "1.0.0",
  "description": "一个示例 Tapp 应用",
  "main": "index.js",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "permissions": ["storage", "ui:notification"],
  "icon": "🚀"
}
```

### 2. 编写代码

```javascript
// 当 Tapp 准备就绪时执行
Tapp.lifecycle.onReady(async () => {
  console.log("Tapp 已启动!");

  // 显示通知
  await Tapp.ui.showNotification({
    title: "欢迎",
    message: "应用已启动",
    type: "success",
  });
});

// 当 Tapp 销毁时执行
Tapp.lifecycle.onDestroy(() => {
  console.log("Tapp 已停止");
});
```

### 3. 安装

在 Tapp 管理页面点击"自定义安装"，粘贴 Manifest 和代码即可。

---

## 代码架构

Tapp 使用**分离模式**，将代码分为三部分：

```
TappCodeStructure {
  core: string    // 核心代码：共享工具函数
  widget?: string // 小组件代码：Widget 渲染逻辑
  page?: string   // 页面代码：页面渲染 + 生命周期
}
```

### 为什么使用分离模式？

1. **避免代码冲突**：Widget 模式和 Page 模式加载不同的代码，互不干扰
2. **更小的加载体积**：Widget 只加载 `core + widget`，Page 只加载 `core + page`
3. **清晰的职责分离**：每个部分专注于单一功能

### 代码加载规则

| 模式        | 加载的代码      | 执行内容                      |
| ----------- | --------------- | ----------------------------- |
| Widget 模式 | `core + widget` | 只渲染 Widget，跳过 `onReady` |
| Page 模式   | `core + page`   | 执行完整生命周期，渲染页面    |

### 代码结构示例

```typescript
// 核心代码 - 共享工具函数
const CORE_CODE = `
function getThemeColors(isDark) {
  return {
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    text: isDark ? '#e2e8f0' : '#1e293b',
    accent: '#6366f1',
  };
}
`;

// Widget 代码 - 只定义 Widget 渲染
const WIDGET_CODE = `
Tapp.widgets['my-widget'] = {
  render: async function(container, props) {
    var colors = getThemeColors(props.theme === 'dark');
    container.style.background = colors.bg;
    container.innerHTML = '<div>Widget Content</div>';
  }
};
`;

// Page 代码 - 页面渲染 + 生命周期
const PAGE_CODE = `
Tapp.pages['my-page'] = {
  render: async function(container) {
    var colors = getThemeColors(document.documentElement.classList.contains('dark'));
    container.innerHTML = '<h1>Page Content</h1>';
  }
};

// 生命周期（仅 Page 模式执行）
Tapp.lifecycle.onReady(async function() {
  var container = document.getElementById('tapp-root');
  await Tapp.pages['my-page'].render(container);
});
`;
```

---

## 生命周期

### onReady

当 Tapp 完全加载并准备就绪时触发。

```javascript
Tapp.lifecycle.onReady(async () => {
  // 初始化代码
});
```

### onDestroy

当 Tapp 即将被销毁时触发（停止或卸载）。

```javascript
Tapp.lifecycle.onDestroy(async () => {
  // 清理代码
});
```

### onPause / onResume

当 Tapp 被暂停/恢复时触发。

```javascript
Tapp.lifecycle.onPause(() => {
  // 暂停定时器等
});

Tapp.lifecycle.onResume(() => {
  // 恢复执行
});
```

---

## Widget 预注册机制

**重要**：Widget 从 Manifest 自动预注册，无需在代码中手动注册！

### 注册时机

| 时机        | 行为                                    |
| ----------- | --------------------------------------- |
| Tapp 安装时 | 从 `manifest.widgets` 预注册所有 Widget |
| Tapp 运行时 | Widget 渲染函数可用                     |
| Tapp 未运行 | Widget 显示"需要启动"提示               |

### Dashboard 显示规则

- Widget 在 Tapp 安装后即可添加到 Dashboard
- Widget 只在 Tapp **运行中**时真正渲染
- 未运行时显示启动提示，用户可点击启动 Tapp

```javascript
// manifest.json 中声明 widgets（自动注册）
{
  "widgets": [
    {
      "id": "my-widget",
      "name": "我的小组件",
      "defaultSize": "2x2",
      "sizes": ["1x1", "2x2", "4x2"]
    }
  ]
}

// Widget 代码中只需定义渲染函数
Tapp.widgets['my-widget'] = {
  render: function(container, props) {
    // 渲染逻辑
  }
};
```

---

## 后台运行

Tapp 默认在用户离开运行页面后会被**冻结**（暂停执行）。如果 Tapp 需要在后台持续运行，必须**声明后台运行需求**。

### 后台需求类型

| 类型             | 说明                     | 典型场景                 |
| ---------------- | ------------------------ | ------------------------ |
| `media`          | 媒体控制                 | 音乐播放器扩展           |
| `sync`           | 后台数据同步             | 定时从 API 拉取数据      |
| `notification`   | 定时通知                 | 提醒类应用               |
| `scheduler`      | 定时任务                 | 自动执行脚本             |
| `event-listener` | 事件监听（跨 Tapp 通信） | 需要响应其他 Tapp 的事件 |
| `realtime`       | 实时数据更新             | 需要 WebSocket 类通信    |

### 使用示例

```javascript
Tapp.lifecycle.onReady(async function () {
  // 声明需要后台同步数据
  await Tapp.background.require("sync", "每5分钟同步一次数据");

  // 启动定时同步
  setInterval(syncData, 5 * 60 * 1000);
});
```

---

## 下一步

- [Manifest 配置](./MANIFEST.md) - 完整的配置选项说明
- [API 参考](./API_REFERENCE.md) - 所有可用 API 的详细文档
- [小组件开发](./WIDGET.md) - 创建漂亮的 Widget
- [页面样式规范](./PAGE.md) - 页面布局和深色模式样式
- [样式规范](./STYLING.md) - Glass Morphism 设计规范
- [安全沙箱](./SANDBOX.md) - 沙箱限制和安全机制
