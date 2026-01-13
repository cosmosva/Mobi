# 墨笔 (MoBi)

一款简洁优雅的 Markdown 编辑器，类似 Typora，基于 Tauri 2.0 构建。

![Version](https://img.shields.io/badge/version-0.7.5-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## 功能特性

- **实时预览** - 支持编辑、预览、分屏三种模式
- **Mermaid 图表** - 原生支持 Mermaid 流程图、时序图等
- **文件管理** - 支持粘贴、拖拽图片和文件，自动保存到 `assets/文件名/` 目录
- **链接跳转** - 点击 Markdown 中的本地文件链接可直接打开
- **文件关联** - 支持双击 .md/.markdown/.txt 文件直接打开
- **文件树** - 侧边栏文件浏览器，快速切换文件
- **深色模式** - 跟随系统或手动切换主题
- **快捷键** - Cmd+S 保存、Cmd+O 打开、Cmd+N 新建、Cmd+B 切换侧边栏

## 截图

<!-- 添加应用截图 -->

## 安装

### 下载安装包

从 [Releases](../../releases) 下载最新的 `.dmg` 安装包。

### 从源码构建

```bash
# 克隆项目
git clone git@github.com:cosmosva/Mobi.git
cd mobi

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 系统要求

- macOS 10.15+
- 构建需要：Node.js 18+、Rust

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS
- **后端**: Tauri 2.0 (Rust)
- **编辑器**: @uiw/react-md-editor
- **状态管理**: Zustand
- **图表**: Mermaid

## 许可证

MIT License
