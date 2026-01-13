import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { convertFileSrc } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MermaidRenderer } from './MermaidRenderer';
import { useFilePaste } from '../../hooks/useFilePaste';

// 支持的文件扩展名
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];

// 获取文件图标
const getFileIcon = (ext: string): string => {
  if (IMAGE_EXTENSIONS.includes(ext)) return '🖼️';
  if (DOCUMENT_EXTENSIONS.includes(ext)) {
    if (ext === 'pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    return '📄';
  }
  if (AUDIO_EXTENSIONS.includes(ext)) return '🎵';
  if (VIDEO_EXTENSIONS.includes(ext)) return '🎬';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return '📦';
  return '📎';
};

// 递归提取 React children 中的文本内容
const getTextContent = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return getTextContent(props.children);
  }
  return '';
};

// 自定义 code 标签渲染，支持 mermaid
const CodeBlock = (props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode; className?: string; node?: unknown }) => {
  const { children, className, node, ...rest } = props;
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // 检查是否是 mermaid 代码块
  if (language === 'mermaid') {
    const code = getTextContent(children).replace(/\n$/, '');
    return <MermaidRenderer code={code} />;
  }

  // 普通代码块
  return (
    <code className={className} {...rest}>
      {children}
    </code>
  );
};

// 自定义图片组件 - 支持本地图片路径转换
const CustomImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement> & { baseDir?: string | null }> = ({ src, alt, baseDir, ...rest }) => {
  const [imageSrc, setImageSrc] = useState<string>(src || '');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // 如果是网络图片或 data URL，直接使用
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      setImageSrc(src);
      setHasError(false);
      return;
    }

    // 如果已经是 asset:// 协议，直接使用
    if (src.startsWith('asset://')) {
      setImageSrc(src);
      setHasError(false);
      return;
    }

    // 本地图片路径处理
    let fullPath = src;

    // 如果是相对路径，拼接基础目录
    if (!src.startsWith('/') && baseDir) {
      fullPath = `${baseDir}/${src}`;
    }

    // 使用 convertFileSrc 转换为 Tauri 可访问的 URL
    try {
      const tauriSrc = convertFileSrc(fullPath);
      console.log('图片路径转换:', { src, baseDir, fullPath, tauriSrc });
      setImageSrc(tauriSrc);
      setHasError(false);
    } catch (error) {
      console.error('转换图片路径失败:', error);
      setImageSrc(src);
      setHasError(true);
    }
  }, [src, baseDir]);

  const handleError = () => {
    console.error('图片加载失败:', imageSrc);
    setHasError(true);
  };

  if (hasError) {
    return (
      <span className="text-red-500 text-sm">
        [图片加载失败: {src}]
      </span>
    );
  }

  return <img src={imageSrc} alt={alt || ''} style={{ maxWidth: '100%' }} onError={handleError} {...rest} />;
};

// 自定义链接组件 - 支持本地文件打开
const CustomLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement> & { baseDir?: string | null; children?: React.ReactNode }> = ({ href, children, baseDir, ...rest }) => {
  const isLocalFile = href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('#');

  // 获取文件扩展名
  const ext = href?.split('.').pop()?.toLowerCase() || '';
  const isKnownFileType = [...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS, ...ARCHIVE_EXTENSIONS].includes(ext);

  const handleClick = async (e: React.MouseEvent) => {
    if (!href) return;

    // 网络链接用默认浏览器打开
    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();
      try {
        await openPath(href);
      } catch (error) {
        console.error('打开链接失败:', error);
      }
      return;
    }

    // 本地文件
    if (isLocalFile) {
      e.preventDefault();

      let fullPath = href;
      // 如果是相对路径，拼接基础目录
      if (!href.startsWith('/') && baseDir) {
        fullPath = `${baseDir}/${href}`;
      }

      // 解码 URL 编码的路径（处理中文文件名等）
      try {
        fullPath = decodeURIComponent(fullPath);
      } catch {
        // 如果解码失败，使用原路径
      }

      try {
        console.log('打开本地文件:', fullPath);
        await openPath(fullPath);
      } catch (error) {
        console.error('打开文件失败:', error);
        alert('无法打开文件: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  // 本地文件显示图标
  if (isLocalFile && isKnownFileType) {
    const icon = getFileIcon(ext);
    return (
      <a
        href={href}
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        title={`点击打开: ${href}`}
        {...rest}
      >
        <span>{icon}</span>
        <span>{children}</span>
      </a>
    );
  }

  // 普通链接
  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
      {...rest}
    >
      {children}
    </a>
  );
};

export const Editor: React.FC = () => {
  const { content, setContent, editorMode, currentFilePath, workspaceDir, pendingImageMarkdown, setPendingImageMarkdown } = useEditorStore();
  const { fontSize } = useSettingsStore();
  const { handlePaste } = useFilePaste();
  const editorRef = useRef<HTMLDivElement>(null);

  // 计算基础目录用于解析相对路径图片
  const baseDir = currentFilePath
    ? currentFilePath.split('/').slice(0, -1).join('/')
    : workspaceDir;

  // 使用 useMemo 创建图片组件包装器，传递 baseDir
  const ImageComponent = useMemo(() => {
    return (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
      <CustomImage {...props} baseDir={baseDir} />
    );
  }, [baseDir]);

  // 使用 useMemo 创建链接组件包装器，传递 baseDir
  const LinkComponent = useMemo(() => {
    return (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
      <CustomLink {...props} baseDir={baseDir} />
    );
  }, [baseDir]);

  const handleChange = useCallback((value?: string) => {
    setContent(value || '');
  }, [setContent]);

  // 插入 Markdown 图片到编辑器
  const insertMarkdownImage = useCallback((markdownImage: string) => {
    const textarea = editorRef.current?.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + markdownImage + content.substring(end);
      setContent(newContent);

      // 设置光标位置到插入内容之后
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + markdownImage.length;
        textarea.focus();
      }, 0);
    } else {
      // 如果没有找到 textarea，就追加到内容末尾
      setContent(content + '\n' + markdownImage);
    }
  }, [content, setContent]);

  // 监听外部拖拽的图片（通过 store 传递）
  useEffect(() => {
    if (pendingImageMarkdown) {
      insertMarkdownImage(pendingImageMarkdown);
      setPendingImageMarkdown(null);
    }
  }, [pendingImageMarkdown, insertMarkdownImage, setPendingImageMarkdown]);

  // 处理粘贴事件
  const onPaste = useCallback(async (event: ClipboardEvent) => {
    console.log('粘贴事件触发');

    // 检查是否有图片数据
    const items = event.clipboardData?.items;
    if (!items) {
      console.log('没有 clipboardData.items');
      return;
    }

    // 检查是否有图片
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        hasImage = true;
        break;
      }
    }

    if (!hasImage) {
      console.log('剪贴板中没有图片');
      return;
    }

    // 检查是否有打开的文件或工作目录
    if (!currentFilePath && !workspaceDir) {
      console.warn('请先保存文件或打开一个目录');
      alert('请先保存文件或打开一个目录后再粘贴图片');
      return;
    }

    const markdownImage = await handlePaste(event);
    if (markdownImage) {
      insertMarkdownImage(markdownImage);
    }
  }, [currentFilePath, workspaceDir, handlePaste, insertMarkdownImage]);

  // 添加粘贴事件监听
  useEffect(() => {
    const editorElement = editorRef.current;
    if (editorElement) {
      const pasteHandler = (event: Event) => {
        onPaste(event as ClipboardEvent);
      };

      editorElement.addEventListener('paste', pasteHandler);

      return () => {
        editorElement.removeEventListener('paste', pasteHandler);
      };
    }
  }, [onPaste]);

  // 根据编辑模式设置预览选项
  const getPreviewMode = () => {
    switch (editorMode) {
      case 'edit':
        return 'edit';
      case 'preview':
        return 'preview';
      case 'split':
      default:
        return 'live';
    }
  };

  return (
    <div
      ref={editorRef}
      className="editor-content h-full"
      data-color-mode="auto"
      style={{ fontSize: `${fontSize}px` }}
    >
      <MDEditor
        value={content}
        onChange={handleChange}
        preview={getPreviewMode()}
        height="100%"
        visibleDragbar={editorMode === 'split'}
        hideToolbar={false}
        enableScroll={true}
        textareaProps={{
          placeholder: '开始编写你的 Markdown 文档...',
        }}
        previewOptions={{
          components: {
            code: CodeBlock,
            img: ImageComponent,
            a: LinkComponent,
          },
        }}
      />
    </div>
  );
};

export default Editor;
