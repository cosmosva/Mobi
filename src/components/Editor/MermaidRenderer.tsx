import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useSettingsStore } from '../../stores/settingsStore';

interface MermaidRendererProps {
  code: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { theme } = useSettingsStore();

  // 检测当前是否为深色模式
  const isDarkMode = React.useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // system 模式下检测系统偏好
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code || !containerRef.current) return;

      try {
        // 根据主题设置 mermaid 配置
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          state: {
            useMaxWidth: true,
          },
        });

        // 生成唯一 ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 清理代码中可能的问题字符
        const cleanCode = code.trim();

        const { svg } = await mermaid.render(id, cleanCode);
        setSvg(svg);
        setError('');
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Mermaid 渲染失败');
        setSvg('');
      }
    };

    renderDiagram();
  }, [code, isDarkMode]);

  if (error) {
    return (
      <div className="mermaid-error p-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded">
        <div>Mermaid 渲染错误:</div>
        <pre className="text-xs mt-1 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex justify-center p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidRenderer;
