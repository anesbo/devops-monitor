import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useServerState } from '../context/ServerContext';

export { useTheme } from '../context/ThemeContext';
export type Theme = 'dark' | 'light';

export interface ThemeToggleProps {
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  onToggle?: () => void;
  showLabel?: boolean;
  variant?: 'header' | 'sidebar' | 'icon';
  className?: string;
  isCollapsed?: boolean;
}

export const applyTheme = (targetTheme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (targetTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }
};

export const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('apexpulse_theme') || localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {}
  return 'dark';
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme: controlledTheme,
  onThemeChange,
  onToggle,
  showLabel = false,
  variant = 'header',
  className = '',
  isCollapsed = false,
}) => {
  // Try safely accessing server context if available
  let contextTheme: Theme | undefined;
  let contextToggle: (() => void) | undefined;
  try {
    const serverState = useServerState();
    contextTheme = serverState.theme;
    contextToggle = serverState.toggleTheme;
  } catch {
    // Standalone usage outside ServerProvider
  }

  const [internalTheme, setInternalTheme] = useState<Theme>(() => {
    return controlledTheme ?? contextTheme ?? getInitialTheme();
  });

  const activeTheme: Theme = controlledTheme ?? (contextTheme ?? internalTheme);
  const isDark = activeTheme === 'dark';

  // Synchronize on mount or theme change
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const handleToggle = useCallback(() => {
    const nextTheme: Theme = activeTheme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);

    try {
      localStorage.setItem('theme', nextTheme);
      localStorage.setItem('apexpulse_theme', nextTheme);
    } catch {}

    if (controlledTheme === undefined) {
      setInternalTheme(nextTheme);
      if (contextToggle) {
        contextToggle();
      }
    }

    onToggle?.();
    onThemeChange?.(nextTheme);
  }, [activeTheme, controlledTheme, contextToggle, onToggle, onThemeChange]);

  const ariaLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const titleText = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'sidebar') {
    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={ariaLabel}
          title={titleText}
          className={`relative group flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all ${className}`}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Sun
              data-testid="sun-icon"
              className={`w-4 h-4 text-amber-500 dark:text-amber-400 absolute transition-all duration-300 ease-in-out transform ${
                isDark ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
              }`}
            />
            <Moon
              data-testid="moon-icon"
              className={`w-4 h-4 text-slate-700 dark:text-cyan-400 absolute transition-all duration-300 ease-in-out transform ${
                isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
              }`}
            />
          </div>
          {/* Tooltip on hover */}
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 text-slate-100 dark:text-slate-200 px-2 py-1 text-[10px] font-medium opacity-0 shadow-lg border border-slate-700 transition-opacity duration-150 group-hover:opacity-100 z-50"
          >
            {ariaLabel}
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        title={titleText}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800/80 transition-all ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Sun
              data-testid="sun-icon"
              className={`w-4 h-4 text-amber-500 dark:text-amber-400 absolute transition-all duration-300 ease-in-out transform ${
                isDark ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
              }`}
            />
            <Moon
              data-testid="moon-icon"
              className={`w-4 h-4 text-slate-700 dark:text-cyan-400 absolute transition-all duration-300 ease-in-out transform ${
                isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
              }`}
            />
          </div>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {activeTheme}
        </span>
      </button>
    );
  }

  // Header and Standard Variant
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      title={titleText}
      className={`relative group inline-flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-[#111a2e] text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          data-testid="sun-icon"
          className={`w-4 h-4 text-amber-500 dark:text-amber-400 absolute transition-all duration-300 ease-in-out transform ${
            isDark ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
          }`}
        />
        <Moon
          data-testid="moon-icon"
          className={`w-4 h-4 text-slate-700 dark:text-cyan-400 absolute transition-all duration-300 ease-in-out transform ${
            isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium capitalize">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
      {/* Tooltip on hover */}
      <span
        role="tooltip"
        className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 text-slate-100 dark:text-slate-200 px-2 py-1 text-[10px] font-medium opacity-0 shadow-lg border border-slate-700 transition-opacity duration-150 group-hover:opacity-100 z-50"
      >
        {ariaLabel}
      </span>
    </button>
  );
};

export default ThemeToggle;
