import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  autoSave: boolean;
  autoSaveInterval: number; // 秒
  showLineNumbers: boolean;
  sidebarWidth: number;
  saveImagesToSubfolder: boolean; // 是否将图片保存到子目录
  imageSubfolderName: string; // 图片子目录名称

  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSaveImagesToSubfolder: (enabled: boolean) => void;
  setImageSubfolderName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      autoSave: true,
      autoSaveInterval: 30,
      showLineNumbers: true,
      sidebarWidth: 250,
      saveImagesToSubfolder: true,
      imageSubfolderName: 'assets',

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSaveImagesToSubfolder: (saveImagesToSubfolder) => set({ saveImagesToSubfolder }),
      setImageSubfolderName: (imageSubfolderName) => set({ imageSubfolderName }),
    }),
    {
      name: 'mobi-settings-storage',
    }
  )
);

// 应用主题
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// 初始化时应用主题
export const initTheme = () => {
  const { theme } = useSettingsStore.getState();
  applyTheme(theme);

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
};
