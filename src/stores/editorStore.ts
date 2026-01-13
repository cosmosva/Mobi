import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorMode = 'edit' | 'preview' | 'split';

interface EditorState {
  // 当前内容
  content: string;
  // 当前文件路径
  currentFilePath: string | null;
  // 当前文件名
  currentFileName: string;
  // 是否已修改
  isModified: boolean;
  // 编辑模式
  editorMode: EditorMode;
  // 最近打开的文件
  recentFiles: string[];
  // 当前工作目录
  workspaceDir: string | null;
  // 待插入的图片 Markdown（用于从外部拖拽时插入）
  pendingImageMarkdown: string | null;

  // Actions
  setContent: (content: string) => void;
  setCurrentFile: (path: string | null, name?: string) => void;
  setIsModified: (modified: boolean) => void;
  setEditorMode: (mode: EditorMode) => void;
  setWorkspaceDir: (dir: string | null) => void;
  addRecentFile: (path: string) => void;
  resetEditor: () => void;
  setPendingImageMarkdown: (markdown: string | null) => void;
}

const getFileName = (path: string | null): string => {
  if (!path) return '未命名';
  const parts = path.split('/');
  return parts[parts.length - 1] || '未命名';
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      content: '# 欢迎使用墨笔\n\n开始编写你的 Markdown 文档...\n',
      currentFilePath: null,
      currentFileName: '未命名',
      isModified: false,
      editorMode: 'split',
      recentFiles: [],
      workspaceDir: null,
      pendingImageMarkdown: null,

      setContent: (content) => {
        set({ content, isModified: true });
      },

      setCurrentFile: (path, name) => {
        const fileName = name || getFileName(path);
        set({
          currentFilePath: path,
          currentFileName: fileName,
          isModified: false
        });
        if (path) {
          get().addRecentFile(path);
        }
      },

      setIsModified: (modified) => set({ isModified: modified }),

      setEditorMode: (mode) => set({ editorMode: mode }),

      setWorkspaceDir: (dir) => set({ workspaceDir: dir }),

      addRecentFile: (path) => {
        const { recentFiles } = get();
        const filtered = recentFiles.filter(f => f !== path);
        set({ recentFiles: [path, ...filtered].slice(0, 10) });
      },

      resetEditor: () => {
        set({
          content: '# 欢迎使用墨笔\n\n开始编写你的 Markdown 文档...\n',
          currentFilePath: null,
          currentFileName: '未命名',
          isModified: false,
        });
      },

      setPendingImageMarkdown: (markdown) => set({ pendingImageMarkdown: markdown }),
    }),
    {
      name: 'mobi-editor-storage',
      partialize: (state) => ({
        editorMode: state.editorMode,
        recentFiles: state.recentFiles,
        workspaceDir: state.workspaceDir,
      })
    }
  )
);
