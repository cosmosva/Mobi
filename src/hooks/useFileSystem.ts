import { useCallback } from 'react';
import { open, save, ask } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, exists, mkdir, remove, rename } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '../stores/editorStore';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileInfo[];
}

export const useFileSystem = () => {
  const {
    setContent,
    setCurrentFile,
    setIsModified,
    setWorkspaceDir,
    resetEditor
  } = useEditorStore();

  // 获取文件所在目录
  const getDirectory = (filePath: string): string => {
    const parts = filePath.split('/');
    parts.pop(); // 移除文件名
    return parts.join('/');
  };

  // 保存文件 - 直接从 store 获取最新值
  const saveFile = useCallback(async (forceSaveAs = false) => {
    try {
      // 直接获取最新的 store 状态
      const { content, currentFilePath } = useEditorStore.getState();

      let targetPath = currentFilePath;

      if (!targetPath || forceSaveAs) {
        targetPath = await save({
          filters: [{
            name: 'Markdown',
            extensions: ['md']
          }],
          defaultPath: 'untitled.md'
        });
      }

      if (!targetPath) return null;

      await writeTextFile(targetPath, content);
      setCurrentFile(targetPath);
      setIsModified(false);

      return targetPath;
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  }, [setCurrentFile, setIsModified]);

  // 检查是否需要保存
  const checkUnsavedChanges = useCallback(async (): Promise<boolean> => {
    const { isModified } = useEditorStore.getState();
    if (!isModified) return true;

    const result = await ask('当前文档有未保存的更改，是否保存？', {
      title: '未保存的更改',
      kind: 'warning',
      okLabel: '保存',
      cancelLabel: '不保存',
    });

    if (result) {
      await saveFile();
    }
    return true;
  }, [saveFile]);

  // 新建文件
  const newFile = useCallback(async () => {
    await checkUnsavedChanges();
    resetEditor();
  }, [checkUnsavedChanges, resetEditor]);

  // 打开文件（可选：是否同时设置工作目录）
  const openFile = useCallback(async (filePath?: string, setWorkspace: boolean = true) => {
    try {
      await checkUnsavedChanges();

      let targetPath = filePath;

      if (!targetPath) {
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'Markdown',
            extensions: ['md', 'markdown', 'txt']
          }]
        });

        if (!selected) return null;
        targetPath = selected as string;
      }

      const fileContent = await readTextFile(targetPath);
      setContent(fileContent);
      setCurrentFile(targetPath);
      setIsModified(false);

      // 如果需要，同时设置工作目录为文件所在目录
      if (setWorkspace) {
        const dir = getDirectory(targetPath);
        setWorkspaceDir(dir);
      }

      return targetPath;
    } catch (error) {
      console.error('打开文件失败:', error);
      throw error;
    }
  }, [checkUnsavedChanges, setContent, setCurrentFile, setIsModified, setWorkspaceDir]);

  // 另存为
  const saveFileAs = useCallback(async () => {
    return saveFile(true);
  }, [saveFile]);

  // 读取目录
  const readDirectory = useCallback(async (dirPath: string): Promise<FileInfo[]> => {
    try {
      const entries = await readDir(dirPath);
      const files: FileInfo[] = [];

      for (const entry of entries) {
        // 跳过隐藏文件
        if (entry.name.startsWith('.')) continue;

        const fullPath = `${dirPath}/${entry.name}`;
        const fileInfo: FileInfo = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory || false,
        };

        files.push(fileInfo);
      }

      // 排序：文件夹在前，文件在后，按名称排序
      return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    } catch (error) {
      console.error('读取目录失败:', error);
      return [];
    }
  }, []);

  // 创建文件
  const createFile = useCallback(async (dirPath: string, fileName: string) => {
    const filePath = `${dirPath}/${fileName}`;
    try {
      const fileExists = await exists(filePath);
      if (fileExists) {
        throw new Error('文件已存在');
      }
      await writeTextFile(filePath, '');
      return filePath;
    } catch (error) {
      console.error('创建文件失败:', error);
      throw error;
    }
  }, []);

  // 创建文件夹
  const createFolder = useCallback(async (dirPath: string, folderName: string) => {
    const folderPath = `${dirPath}/${folderName}`;
    try {
      await mkdir(folderPath);
      return folderPath;
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  }, []);

  // 删除文件或文件夹
  const deleteItem = useCallback(async (itemPath: string) => {
    try {
      const confirmed = await ask(`确定要删除吗？此操作无法撤销。`, {
        title: '确认删除',
        kind: 'warning',
        okLabel: '删除',
        cancelLabel: '取消',
      });

      if (confirmed) {
        await remove(itemPath, { recursive: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除失败:', error);
      throw error;
    }
  }, []);

  // 重命名
  const renameItem = useCallback(async (oldPath: string, newName: string) => {
    try {
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');

      await rename(oldPath, newPath);
      return newPath;
    } catch (error) {
      console.error('重命名失败:', error);
      throw error;
    }
  }, []);

  return {
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    readDirectory,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    checkUnsavedChanges,
  };
};
