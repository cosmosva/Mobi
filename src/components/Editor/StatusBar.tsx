import React from 'react';
import { useEditorStore } from '../../stores/editorStore';

export const StatusBar: React.FC = () => {
  const { content, currentFilePath, isModified } = useEditorStore();

  // 统计字数
  const wordCount = content.length;
  const lineCount = content.split('\n').length;
  const charCountNoSpace = content.replace(/\s/g, '').length;

  return (
    <div className="status-bar flex items-center justify-between px-4 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <span>字符: {wordCount}</span>
        <span>字符(不含空格): {charCountNoSpace}</span>
        <span>行数: {lineCount}</span>
      </div>
      <div className="flex items-center gap-4">
        {currentFilePath && (
          <span className="truncate max-w-md" title={currentFilePath}>
            {currentFilePath}
          </span>
        )}
        {isModified && <span className="text-orange-500">未保存</span>}
      </div>
    </div>
  );
};

export default StatusBar;
