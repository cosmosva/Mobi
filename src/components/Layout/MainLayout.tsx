import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Toolbar, StatusBar } from '../Editor';
import { FileTree } from '../Sidebar';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useSettingsStore, initTheme } from '../../stores/settingsStore';
import { useEditorStore } from '../../stores/editorStore';
import { useImagePaste } from '../../hooks/useImagePaste';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// 图片扩展名列表
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

export const MainLayout: React.FC = () => {
  const { sidebarWidth, setSidebarWidth } = useSettingsStore();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const { openFile, saveFile, newFile } = useFileSystem();
  const { currentFilePath, workspaceDir, setPendingImageMarkdown } = useEditorStore();
  const { handleTauriDrop } = useImagePaste();

  // 使用 ref 保存最新的函数引用
  const openFileRef = useRef(openFile);
  const saveFileRef = useRef(saveFile);
  const newFileRef = useRef(newFile);
  openFileRef.current = openFile;
  saveFileRef.current = saveFile;
  newFileRef.current = newFile;

  // 初始化主题
  useEffect(() => {
    initTheme();
  }, []);

  // 启动时检查是否有待打开的文件（通过"打开方式"启动）
  useEffect(() => {
    const checkOpenedFile = async () => {
      try {
        const filePath = await invoke<string | null>('get_opened_file');
        if (filePath && filePath.match(/\.(md|markdown|txt)$/i)) {
          await openFileRef.current(filePath, true);
        }
      } catch (error) {
        console.error('检查打开文件失败:', error);
      }
    };

    // 延迟一下确保 openFileRef 已更新
    const timer = setTimeout(checkOpenedFile, 100);
    return () => clearTimeout(timer);
  }, []);

  // 监听从系统拖拽打开的文件（markdown 文件和图片文件）
  useEffect(() => {
    const setupFileOpenHandler = async () => {
      try {
        const appWindow = getCurrentWindow();
        const unlisten = await appWindow.onDragDropEvent(async (event) => {
          if (event.payload.type === 'enter') {
            // 检查是否有图片文件
            const paths = event.payload.paths || [];
            const hasImage = paths.some((p: string) => {
              const ext = p.split('.').pop()?.toLowerCase() || '';
              return IMAGE_EXTENSIONS.includes(ext);
            });
            if (hasImage) {
              setIsDraggingImage(true);
            }
          } else if (event.payload.type === 'leave') {
            setIsDraggingImage(false);
          } else if (event.payload.type === 'drop' && event.payload.paths.length > 0) {
            setIsDraggingImage(false);
            const filePath = event.payload.paths[0];
            const ext = filePath.split('.').pop()?.toLowerCase() || '';

            // 如果是图片文件，插入到编辑器
            if (IMAGE_EXTENSIONS.includes(ext)) {
              // 检查是否有打开的文件或工作目录
              if (!currentFilePath && !workspaceDir) {
                alert('请先保存文件或打开一个目录后再拖拽图片');
                return;
              }
              const markdownImage = await handleTauriDrop(event.payload.paths);
              if (markdownImage) {
                // 通过 store 设置待插入的图片，让 Editor 组件插入到光标位置
                setPendingImageMarkdown(markdownImage);
              }
            } else if (filePath.match(/\.(md|markdown|txt)$/i)) {
              // 从外部拖拽打开，设置工作目录为文件所在目录
              await openFileRef.current(filePath, true);
            }
          }
        });
        return unlisten;
      } catch (error) {
        console.error('设置文件打开监听失败:', error);
      }
    };

    const cleanup = setupFileOpenHandler();
    return () => {
      cleanup?.then(unlisten => unlisten?.());
    };
  }, [currentFilePath, workspaceDir, handleTauriDrop, setPendingImageMarkdown]);

  // 监听从系统双击打开的文件 (通过命令行参数)
  useEffect(() => {
    const setupOpenFileListener = async () => {
      const unlisten = await listen<string>('open-file', async (event) => {
        const filePath = event.payload;
        if (filePath && filePath.match(/\.(md|markdown|txt)$/i)) {
          // 从外部双击打开，设置工作目录为文件所在目录
          await openFileRef.current(filePath, true);
        }
      });
      return unlisten;
    };

    const cleanup = setupOpenFileListener();
    return () => {
      cleanup.then(unlisten => unlisten());
    };
  }, []);

  // 侧边栏文件选择处理 - 不改变工作目录
  const handleFileSelect = useCallback((path: string) => {
    openFileRef.current(path, false).catch(error => {
      console.error('打开文件失败:', error);
    });
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            newFileRef.current();
            break;
          case 'o':
            e.preventDefault();
            openFileRef.current();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              saveFileRef.current(true);
            } else {
              saveFileRef.current();
            }
            break;
          case 'b':
            e.preventDefault();
            setSidebarVisible(v => !v);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 拖拽调整侧边栏宽度
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 relative">
      {/* 图片拖拽指示器 */}
      {isDraggingImage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
          <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
            释放以插入图片
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <Toolbar
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        sidebarVisible={sidebarVisible}
      />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        {sidebarVisible && (
          <>
            <div
              className="sidebar flex-shrink-0"
              style={{ width: `${sidebarWidth}px` }}
            >
              <FileTree onFileSelect={handleFileSelect} />
            </div>

            {/* 拖拽分隔线 */}
            <div
              className="resize-handle"
              onMouseDown={handleMouseDown}
              style={{ cursor: isResizing ? 'col-resize' : undefined }}
            />
          </>
        )}

        {/* 编辑器区域 */}
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
      </div>

      {/* 状态栏 */}
      <StatusBar />
    </div>
  );
};

export default MainLayout;
