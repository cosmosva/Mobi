import { useCallback } from 'react';
import { writeFile, exists, mkdir, readFile } from '@tauri-apps/plugin-fs';
import { useEditorStore } from '../stores/editorStore';
import { useSettingsStore } from '../stores/settingsStore';

// 图片扩展名列表
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

export const useImagePaste = () => {
  const { currentFilePath, workspaceDir } = useEditorStore();
  const { saveImagesToSubfolder, imageSubfolderName } = useSettingsStore();

  // 生成唯一的图片文件名
  const generateImageName = useCallback((extension: string = 'png') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `image_${timestamp}_${random}.${extension}`;
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
  const getExtensionFromMime = useCallback((mimeType: string): string => {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
    };
    return mimeToExt[mimeType] || 'png';
  }, []);

  // 保存图片到文件系统
  const saveImage = useCallback(async (imageData: ArrayBuffer, extension: string = 'png'): Promise<string | null> => {
    const baseDir = getBaseDir();

    if (!baseDir) {
      console.warn('无法保存图片：没有打开的文件或工作目录');
      alert('请先保存文件或打开一个目录后再粘贴图片');
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

      const imageName = generateImageName(extension);
      const imagePath = `${targetDir}/${imageName}`;

      console.log('保存图片到:', imagePath);

      // 写入图片文件
      await writeFile(imagePath, new Uint8Array(imageData));

      console.log('图片保存成功');

      // 返回相对路径用于 Markdown
      if (saveImagesToSubfolder && imageSubfolderName) {
        return `${imageSubfolderName}/${imageName}`;
      }
      return imageName;
    } catch (error) {
      console.error('保存图片失败:', error);
      alert('保存图片失败: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }, [getBaseDir, saveImagesToSubfolder, imageSubfolderName, generateImageName]);

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

      if (item.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();

        const blob = item.getAsFile();
        if (!blob) {
          console.log('无法获取图片文件');
          continue;
        }

        console.log('获取到图片文件:', blob.size, 'bytes');

        const extension = getExtensionFromMime(item.type);
        const arrayBuffer = await blob.arrayBuffer();
        const relativePath = await saveImage(arrayBuffer, extension);

        if (relativePath) {
          return `![](${relativePath})`;
        }
      }
    }
    return null;
  }, [saveImage, getExtensionFromMime]);

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

      if (file.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();

        const extension = getExtensionFromMime(file.type) || file.name.split('.').pop() || 'png';
        const arrayBuffer = await file.arrayBuffer();
        const relativePath = await saveImage(arrayBuffer, extension);

        if (relativePath) {
          return `![](${relativePath})`;
        }
      }
    }
    return null;
  }, [saveImage, getExtensionFromMime]);

  // 处理 Tauri 拖拽事件（接收文件路径数组）
  const handleTauriDrop = useCallback(async (paths: string[]): Promise<string | null> => {
    if (!paths || paths.length === 0) {
      console.log('没有拖拽的文件路径');
      return null;
    }

    const baseDir = getBaseDir();
    if (!baseDir) {
      console.warn('无法保存图片：没有打开的文件或工作目录');
      alert('请先保存文件或打开一个目录后再拖拽图片');
      return null;
    }

    console.log('Tauri 拖拽文件路径:', paths);

    for (const filePath of paths) {
      // 获取文件扩展名
      const ext = filePath.split('.').pop()?.toLowerCase() || '';

      if (IMAGE_EXTENSIONS.includes(ext)) {
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

          // 生成新文件名
          const imageName = generateImageName(ext);
          const targetPath = `${targetDir}/${imageName}`;

          console.log('复制图片到:', targetPath);

          // 写入目标文件
          await writeFile(targetPath, fileData);

          console.log('图片复制成功');

          // 返回相对路径
          if (saveImagesToSubfolder && imageSubfolderName) {
            return `![](${imageSubfolderName}/${imageName})`;
          }
          return `![](${imageName})`;
        } catch (error) {
          console.error('处理拖拽图片失败:', error);
          alert('处理拖拽图片失败: ' + (error instanceof Error ? error.message : String(error)));
        }
      }
    }
    return null;
  }, [getBaseDir, saveImagesToSubfolder, imageSubfolderName, generateImageName]);

  return {
    handlePaste,
    handleDrop,
    handleTauriDrop,
    saveImage,
    getBaseDir,
  };
};
