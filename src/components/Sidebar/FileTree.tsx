import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '../../stores/editorStore';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileTreeProps {
  onFileSelect: (path: string) => void;
}

// 读取目录内容
async function loadDirContents(dirPath: string): Promise<FileInfo[]> {
  try {
    const entries = await readDir(dirPath);
    const files: FileInfo[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      files.push({
        name: entry.name,
        path: `${dirPath}/${entry.name}`,
        isDirectory: entry.isDirectory || false,
      });
    }

    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  } catch (error) {
    console.error('读取目录失败:', error);
    return [];
  }
}

// 单个文件/文件夹项组件
const FileItem: React.FC<{
  item: FileInfo;
  depth: number;
  currentFilePath: string | null;
  onFileSelect: (path: string) => void;
}> = ({ item, depth, currentFilePath, onFileSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isMarkdown = /\.(md|markdown|txt)$/i.test(item.name);
  const isActive = item.path === currentFilePath;

  const handleClick = async () => {
    if (item.isDirectory) {
      if (!isExpanded && children.length === 0) {
        setIsLoading(true);
        const contents = await loadDirContents(item.path);
        setChildren(contents);
        setIsLoading(false);
      }
      setIsExpanded(!isExpanded);
    } else if (isMarkdown) {
      onFileSelect(item.path);
    }
  };

  return (
    <div>
      <div
        className={`file-item flex items-center gap-2 text-gray-700 dark:text-gray-300 ${isActive ? 'active' : ''} ${
          !item.isDirectory && !isMarkdown ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {item.isDirectory && (
          <span className="text-xs text-gray-500 dark:text-gray-400 w-3">
            {isLoading ? '...' : isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!item.isDirectory && <span className="w-3" />}

        <span className="text-sm">
          {item.isDirectory
            ? isExpanded ? '📂' : '📁'
            : isMarkdown ? '📝' : '📄'}
        </span>

        <span className="truncate text-sm">{item.name}</span>
      </div>

      {item.isDirectory && isExpanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <FileItem
              key={child.path}
              item={child}
              depth={depth + 1}
              currentFilePath={currentFilePath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect }) => {
  const { workspaceDir, setWorkspaceDir, currentFilePath } = useEditorStore();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 选择工作目录
  const selectWorkspace = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择工作目录'
    });

    if (selected) {
      setWorkspaceDir(selected as string);
    }
  };

  // 当工作目录改变时加载内容
  useEffect(() => {
    if (workspaceDir) {
      setLoading(true);
      loadDirContents(workspaceDir).then(contents => {
        setFiles(contents);
        setLoading(false);
      });
    }
  }, [workspaceDir]);

  return (
    <div className="file-tree h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* 标题栏 */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
            文件
          </span>
          <button
            onClick={selectWorkspace}
            className="text-xs text-blue-500 hover:text-blue-600"
            title="选择文件夹"
          >
            📁
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-auto py-2">
        {loading ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">加载中...</div>
        ) : workspaceDir ? (
          files.length > 0 ? (
            files.map(file => (
              <FileItem
                key={file.path}
                item={file}
                depth={0}
                currentFilePath={currentFilePath}
                onFileSelect={onFileSelect}
              />
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">空文件夹</div>
          )
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">未选择工作目录</p>
            <button
              onClick={selectWorkspace}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              打开文件夹
            </button>
          </div>
        )}
      </div>

      {/* 工作目录路径 */}
      {workspaceDir && (
        <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 truncate">
          {workspaceDir}
        </div>
      )}
    </div>
  );
};

export default FileTree;
