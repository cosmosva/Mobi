import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { MermaidRenderer } from './MermaidRenderer';
import { useFilePaste } from '../../hooks/useFilePaste';

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
          },
        }}
      />
    </div>
  );
};

export default Editor;
