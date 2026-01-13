import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { marked } from 'marked';
import { useEditorStore } from '../stores/editorStore';

export type ExportFormat = 'html' | 'md';

export const useExport = () => {
  const { content, currentFileName } = useEditorStore();

  // 生成 HTML 内容
  const generateHtml = useCallback(async (markdown: string, title: string): Promise<string> => {
    const bodyHtml = await marked(markdown);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 16px; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: #f6f8fa;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
    }
    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 6px;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: #6a737d;
      border-left: 4px solid #dfe2e5;
    }
    ul, ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
    }
    li + li {
      margin-top: 0.25em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    table th, table td {
      padding: 8px 13px;
      border: 1px solid #dfe2e5;
    }
    table th {
      font-weight: 600;
      background-color: #f6f8fa;
    }
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    .task-list-item {
      list-style-type: none;
    }
    .task-list-item input {
      margin-right: 0.5em;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }, []);

  // 导出为 HTML
  const exportToHtml = useCallback(async () => {
    try {
      const title = currentFileName.replace(/\.(md|markdown)$/i, '') || 'document';
      const htmlContent = await generateHtml(content, title);

      const savePath = await save({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: `${title}.html`
      });

      if (savePath) {
        await writeTextFile(savePath, htmlContent);
        return savePath;
      }
    } catch (error) {
      console.error('导出 HTML 失败:', error);
      throw error;
    }
    return null;
  }, [content, currentFileName, generateHtml]);

  // 导出为 Markdown（另存为纯文本）
  const exportToMarkdown = useCallback(async () => {
    try {
      const title = currentFileName.replace(/\.(md|markdown)$/i, '') || 'document';

      const savePath = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: `${title}.md`
      });

      if (savePath) {
        await writeTextFile(savePath, content);
        return savePath;
      }
    } catch (error) {
      console.error('导出 Markdown 失败:', error);
      throw error;
    }
    return null;
  }, [content, currentFileName]);

  // 复制为 HTML
  const copyAsHtml = useCallback(async () => {
    try {
      const htmlContent = await marked(content);
      await navigator.clipboard.writeText(htmlContent);
      return true;
    } catch (error) {
      console.error('复制 HTML 失败:', error);
      return false;
    }
  }, [content]);

  // 通用导出函数
  const exportDocument = useCallback(async (format: ExportFormat) => {
    switch (format) {
      case 'html':
        return exportToHtml();
      case 'md':
        return exportToMarkdown();
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
  }, [exportToHtml, exportToMarkdown]);

  return {
    exportToHtml,
    exportToMarkdown,
    copyAsHtml,
    exportDocument,
  };
};
