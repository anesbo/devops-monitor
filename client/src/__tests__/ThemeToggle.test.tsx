import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeToggle, applyTheme, getInitialTheme } from '../components/ThemeToggle';
import { ServerProvider } from '../context/ServerContext';

describe('ThemeToggle Component & Dual-Theme Verification Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  describe('1. Icon and UI Rendering based on current theme', () => {
    it('renders toggle button with Sun and Moon icons and default dark mode state', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /switch to light mode/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');

      const sunIcon = screen.getByTestId('sun-icon');
      const moonIcon = screen.getByTestId('moon-icon');
      expect(sunIcon).toBeInTheDocument();
      expect(moonIcon).toBeInTheDocument();

      // In dark mode: moon is visible (opacity-100), sun is hidden/scaled (opacity-0)
      expect(moonIcon.getAttribute('class')).toContain('opacity-100');
      expect(moonIcon.getAttribute('class')).toContain('scale-100');
      expect(sunIcon.getAttribute('class')).toContain('opacity-0');
      expect(sunIcon.getAttribute('class')).toContain('scale-0');
    });

    it('renders with sun icon visible when controlled theme is light', () => {
      render(<ThemeToggle theme="light" />);

      const button = screen.getByRole('button', { name: /switch to dark mode/i });
      expect(button).toBeInTheDocument();

      const sunIcon = screen.getByTestId('sun-icon');
      const moonIcon = screen.getByTestId('moon-icon');

      // In light mode: sun is visible (opacity-100), moon is hidden/scaled (opacity-0)
      expect(sunIcon.getAttribute('class')).toContain('opacity-100');
      expect(sunIcon.getAttribute('class')).toContain('scale-100');
      expect(moonIcon.getAttribute('class')).toContain('opacity-0');
      expect(moonIcon.getAttribute('class')).toContain('scale-0');
    });

    it('renders text label when showLabel prop is true', () => {
      const { rerender } = render(<ThemeToggle showLabel={true} theme="dark" />);
      expect(screen.getByText('Dark')).toBeInTheDocument();

      rerender(<ThemeToggle showLabel={true} theme="light" />);
      expect(screen.getByText('Light')).toBeInTheDocument();
    });

    it('renders sidebar variant in collapsed and expanded modes', () => {
      // Expanded mode
      const { rerender } = render(
        <ThemeToggle variant="sidebar" isCollapsed={false} theme="dark" />
      );
      expect(screen.getByText('Light Mode')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();

      // Collapsed mode
      rerender(<ThemeToggle variant="sidebar" isCollapsed={true} theme="dark" />);
      const collapsedBtn = screen.getByRole('button', { name: /switch to light mode/i });
      expect(collapsedBtn).toBeInTheDocument();
      expect(screen.queryByText('Light Mode')).not.toBeInTheDocument();
    });
  });

  describe('2. Theme Toggle Interactions, Handlers & HTML Class Updates', () => {
    it('toggles theme on click and updates document HTML class', () => {
      render(<ThemeToggle />);

      // Initially dark mode
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);

      const button = screen.getByRole('button', { name: /switch to light mode/i });

      // Click to toggle to light mode
      act(() => {
        fireEvent.click(button);
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

      // Click again to toggle back to dark mode
      act(() => {
        fireEvent.click(button);
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('calls onThemeChange and onToggle callback handlers on click', () => {
      const onThemeChange = vi.fn();
      const onToggle = vi.fn();

      render(<ThemeToggle onThemeChange={onThemeChange} onToggle={onToggle} />);

      const button = screen.getByRole('button', { name: /switch to light mode/i });
      act(() => {
        fireEvent.click(button);
      });

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onThemeChange).toHaveBeenCalledTimes(1);
      expect(onThemeChange).toHaveBeenCalledWith('light');

      act(() => {
        fireEvent.click(button);
      });

      expect(onToggle).toHaveBeenCalledTimes(2);
      expect(onThemeChange).toHaveBeenCalledTimes(2);
      expect(onThemeChange).toHaveBeenLastCalledWith('dark');
    });
  });

  describe('3. Theme Persistence to localStorage', () => {
    it('persists selected theme to localStorage when toggled', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /switch to light mode/i });

      act(() => {
        fireEvent.click(button);
      });

      expect(localStorage.getItem('theme')).toBe('light');
      expect(localStorage.getItem('apexpulse_theme')).toBe('light');

      act(() => {
        fireEvent.click(button);
      });

      expect(localStorage.getItem('theme')).toBe('dark');
      expect(localStorage.getItem('apexpulse_theme')).toBe('dark');
    });

    it('initializes from saved localStorage theme preference', () => {
      localStorage.setItem('theme', 'light');

      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      const button = screen.getByRole('button', { name: /switch to dark mode/i });
      expect(button).toBeInTheDocument();
    });

    it('initializes correctly when saved under apexpulse_theme key', () => {
      localStorage.setItem('apexpulse_theme', 'light');

      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains('light')).toBe(true);
      const button = screen.getByRole('button', { name: /switch to dark mode/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('4. Theme Utility Functions', () => {
    it('applyTheme correctly updates classList and colorScheme style', () => {
      applyTheme('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');

      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('getInitialTheme defaults to dark when storage is empty', () => {
      const theme = getInitialTheme();
      expect(theme).toBe('dark');
    });
  });

  describe('5. Integration with ServerProvider', () => {
    it('works seamlessly inside ServerProvider hierarchy', () => {
      render(
        <ServerProvider>
          <ThemeToggle />
        </ServerProvider>
      );

      const button = screen.getByRole('button', { name: /switch to light mode/i });
      expect(button).toBeInTheDocument();

      act(() => {
        fireEvent.click(button);
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });
});
