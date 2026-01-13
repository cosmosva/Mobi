import { useCallback } from 'react';
import { writeFile, exists, mkdir, readFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '../stores/editorStore';
import { useSettingsStore } from '../stores/settingsStore';

// 图片扩展名列表
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

// 支持的其他文件类型
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];

// 所有支持的文件扩展名
const SUPPORTED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
];

export const useFilePaste = () => {
  const { currentFilePath, workspaceDir } = useEditorStore();
  const { saveImagesToSubfolder, imageSubfolderName } = useSettingsStore();

  // 生成唯一的文件名
  const generateFileName = useCallback((extension: string = 'png', prefix: string = 'file') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }, []);

  // 获取基础目录（文件所在目录或工作目录）
  const getBaseDir = useCallback((): string | null => {
    if (currentFilePath) {
      // 从文件路径获取目录
      const parts = currentFilePath.split('/');
      parts.pop();
      return parts.join('/');
    }
    return workspaceDir;
  }, [currentFilePath, workspaceDir]);

  // 从 MIME 类型获取文件扩展名
  const getExtensionFromMime = useCallback((mimeType: string): string | null => {
    const mimeToExt: Record<string, string> = {
      // 图片
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
      // 文档
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      // 音频
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      // 视频
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv',
      // 压缩包
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/x-7z-compressed': '7z',
      'application/x-tar': 'tar',
      'application/gzip': 'gz',
    };
    return mimeToExt[mimeType] || null;
  }, []);

  // 判断是否为图片扩展名
  const isImageExtension = useCallback((ext: string): boolean => {
    return IMAGE_EXTENSIONS.includes(ext.toLowerCase());
  }, []);

  // 根据文件类型生成 Markdown 链接
  const generateMarkdownLink = useCallback((relativePath: string, fileName: string, extension: string): string => {
    if (isImageExtension(extension)) {
      return `![](${relativePath})`;
    }
    // 非图片文件使用普通链接格式
    return `[${fileName}](${relativePath})`;
  }, [isImageExtension]);

  // 保存文件到文件系统
  const saveFile = useCallback(async (fileData: ArrayBuffer, extension: string = 'png'): Promise<{ relativePath: string; fileName: string } | null> => {
    const baseDir = getBaseDir();

    if (!baseDir) {
      console.warn('无法保存文件：没有打开的文件或工作目录');
      alert('请先保存文件或打开一个目录后再粘贴/拖拽文件');
      return null;
    }

    try {
      let targetDir = baseDir;

      // 如果设置了保存到子目录
      if (saveImagesToSubfolder && imageSubfolderName) {
        targetDir = `${baseDir}/${imageSubfolderName}`;

        // 确保子目录存在
        const dirExists = await exists(targetDir);
        if (!dirExists) {
          await mkdir(targetDir, { recursive: true });
        }
      }

      // 根据文件类型选择前缀
      const prefix = isImageExtension(extension) ? 'image' : 'file';
      const fileName = generateFileName(extension, prefix);
      const filePath = `${targetDir}/${fileName}`;

      console.log('保存文件到:', filePath);

      // 写入文件
      await writeFile(filePath, new Uint8Array(fileData));

      console.log('文件保存成功');

      // 返回相对路径用于 Markdown
      if (saveImagesToSubfolder && imageSubfolderName) {
        return { relativePath: `${imageSubfolderName}/${fileName}`, fileName };
      }
      return { relativePath: fileName, fileName };
    } catch (error) {
      console.error('保存文件失败:', error);
      alert('保存文件失败: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }, [getBaseDir, saveImagesToSubfolder, imageSubfolderName, generateFileName, isImageExtension]);

  // 处理粘贴事件
  const handlePaste = useCallback(async (event: ClipboardEvent): Promise<string | null> => {
    const items = event.clipboardData?.items;
    if (!items) {
      console.log('没有剪贴板数据');
      return null;
    }

    console.log('剪贴板项目数量:', items.length);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`项目 ${i}: 类型=${item.type}, 种类=${item.kind}`);

      // 检查是否为支持的文件类型
      const extension = getExtensionFromMime(item.type);
      if (extension && item.kind === 'file') {
        event.preventDefault();
        event.stopPropagation();

        const blob = item.getAsFile();
        if (!blob) {
          console.log('无法获取文件');
          continue;
        }

        console.log('获取到文件:', blob.size, 'bytes, 类型:', item.type);

        const arrayBuffer = await blob.arrayBuffer();
        const result = await saveFile(arrayBuffer, extension);

        if (result) {
          return generateMarkdownLink(result.relativePath, result.fileName, extension);
        }
      }
    }
    return null;
  }, [saveFile, getExtensionFromMime, generateMarkdownLink]);

  // 处理拖拽文件
  const handleDrop = useCallback(async (event: DragEvent): Promise<string | null> => {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      console.log('没有拖拽的文件');
      return null;
    }

    console.log('拖拽文件数量:', files.length);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`文件 ${i}: ${file.name}, 类型=${file.type}, 大小=${file.size}`);

      // 从 MIME 类型或文件名获取扩展名
      let extension = getExtensionFromMime(file.type);
      if (!extension) {
        extension = file.name.split('.').pop()?.toLowerCase() || null;
      }

      // 检查是否为支持的文件类型
      if (extension && SUPPORTED_EXTENSIONS.includes(extension)) {
        event.preventDefault();
        event.stopPropagation();

        const arrayBuffer = await file.arrayBuffer();
        const result = await saveFile(arrayBuffer, extension);

        if (result) {
          return generateMarkdownLink(result.relativePath, result.fileName, extension);
        }
      }
    }
    return null;
  }, [saveFile, getExtensionFromMime, generateMarkdownLink]);

  // 处理 Tauri 拖拽事件（接收文件路径数组）
  const handleTauriDrop = useCallback(async (paths: string[]): Promise<string | null> => {
    if (!paths || paths.length === 0) {
      console.log('没有拖拽的文件路径');
      return null;
    }

    const baseDir = getBaseDir();
    if (!baseDir) {
      console.warn('无法保存文件：没有打开的文件或工作目录');
      alert('请先保存文件或打开一个目录后再拖拽文件');
      return null;
    }

    console.log('Tauri 拖拽文件路径:', paths);

    for (const filePath of paths) {
      // 获取文件扩展名和原始文件名
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const originalFileName = filePath.split('/').pop() || '';

      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        try {
          // 读取源文件
          const fileData = await readFile(filePath);

          // 确定目标目录
          let targetDir = baseDir;
          if (saveImagesToSubfolder && imageSubfolderName) {
            targetDir = `${baseDir}/${imageSubfolderName}`;
            const dirExists = await exists(targetDir);
            if (!dirExists) {
              await mkdir(targetDir, { recursive: true });
            }
          }

          // 保留原始文件名，检查是否存在同名文件
          let fileName = originalFileName;
          let targetPath = `${targetDir}/${fileName}`;

          // 如果文件已存在，添加时间戳后缀
          if (await exists(targetPath)) {
            const timestamp = Date.now();
            const nameWithoutExt = originalFileName.replace(/\.[^.]+$/, '');
            fileName = `${nameWithoutExt}_${timestamp}.${ext}`;
            targetPath = `${targetDir}/${fileName}`;
          }

          console.log('复制文件到:', targetPath);

          // 写入目标文件
          await writeFile(targetPath, fileData);

          console.log('文件复制成功');

          // 返回 Markdown 链接
          const relativePath = saveImagesToSubfolder && imageSubfolderName
            ? `${imageSubfolderName}/${fileName}`
            : fileName;

          // 对于链接显示，使用不带后缀的原始文件名作为显示名称
          const displayName = originalFileName.replace(/\.[^.]+$/, '');
          return generateMarkdownLink(relativePath, displayName, ext);
        } catch (error) {
          console.error('处理拖拽文件失败:', error);
          alert('处理拖拽文件失败: ' + (error instanceof Error ? error.message : String(error)));
        }
      }
    }
    return null;
  }, [getBaseDir, saveImagesToSubfolder, imageSubfolderName, generateMarkdownLink]);

  return {
    handlePaste,
    handleDrop,
    handleTauriDrop,
    saveFile,
    getBaseDir,
  };
};
