import React, { useState } from 'react';
import { useEditorStore, EditorMode } from '../../stores/editorStore';
import { useSettingsStore, Theme } from '../../stores/settingsStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useExport } from '../../hooks/useExport';

interface ToolbarProps {
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onToggleSidebar, sidebarVisible }) => {
  const { editorMode, setEditorMode, currentFileName, isModified } = useEditorStore();
  const { theme, setTheme, saveImagesToSubfolder, imageSubfolderName, setSaveImagesToSubfolder, setImageSubfolderName } = useSettingsStore();
  const { newFile, openFile, saveFile, saveFileAs } = useFileSystem();
  const { exportToHtml } = useExport();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState(false);
  const [tempFolderName, setTempFolderName] = useState(imageSubfolderName);

  const modeButtons: { mode: EditorMode; label: string; icon: string }[] = [
    { mode: 'edit', label: '编辑', icon: '✏️' },
    { mode: 'split', label: '分栏', icon: '📑' },
    { mode: 'preview', label: '预览', icon: '👁️' },
  ];

  const themeButtons: { theme: Theme; label: string }[] = [
    { theme: 'light', label: '☀️' },
    { theme: 'dark', label: '🌙' },
    { theme: 'system', label: '💻' },
  ];

  const handleExportHtml = async () => {
    setShowExportMenu(false);
    try {
      await exportToHtml();
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleSaveFolderName = () => {
    if (tempFolderName.trim()) {
      setImageSubfolderName(tempFolderName.trim());
    }
    setEditingFolderName(false);
  };

  return (
    <div className="toolbar flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* 左侧：文件操作 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="toolbar-button"
          title={sidebarVisible ? '隐藏侧边栏 (⌘B)' : '显示侧边栏 (⌘B)'}
        >
          {sidebarVisible ? '◀' : '▶'}
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        <button onClick={newFile} className="toolbar-button" title="新建 (⌘N)">
          新建
        </button>
        <button onClick={() => openFile()} className="toolbar-button" title="打开 (⌘O)">
          打开
        </button>
        <button onClick={() => saveFile()} className="toolbar-button" title="保存 (⌘S)">
          保存
        </button>
        <button onClick={saveFileAs} className="toolbar-button" title="另存为 (⇧⌘S)">
          另存为
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* 导出菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="toolbar-button"
            title="导出"
          >
            导出 ▾
          </button>
          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 min-w-[120px]">
                <button
                  onClick={handleExportHtml}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  导出为 HTML
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 中间：文件名 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {currentFileName}
          {isModified && <span className="text-red-500 ml-1">●</span>}
        </span>
      </div>

      {/* 右侧：模式切换和主题 */}
      <div className="flex items-center gap-2">
        {/* 编辑模式切换 */}
        <div className="flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5">
          {modeButtons.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                editorMode === mode
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* 主题切换 */}
        <div className="flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5">
          {themeButtons.map(({ theme: t, label }) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === t
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* 设置菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="toolbar-button"
            title="设置"
          >
            ⚙️
          </button>
          {showSettingsMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setEditingFolderName(false);
                }}
              />
              <div className="absolute top-full right-0 mt-1 py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 min-w-[240px]">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  图片设置
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveImagesToSubfolder}
                    onChange={(e) => setSaveImagesToSubfolder(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  保存到子目录
                </label>
                {saveImagesToSubfolder && (
                  <div className="mt-2 ml-5">
                    {editingFolderName ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempFolderName}
                          onChange={(e) => setTempFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveFolderName();
                            if (e.key === 'Escape') setEditingFolderName(false);
                          }}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-24"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveFolderName}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          确定
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>目录名: {imageSubfolderName}</span>
                        <button
                          onClick={() => {
                            setTempFolderName(imageSubfolderName);
                            setEditingFolderName(true);
                          }}
                          className="text-blue-500 hover:text-blue-600 text-xs"
                        >
                          编辑
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
