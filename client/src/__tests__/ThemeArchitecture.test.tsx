import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from '../context/ThemeContext';
import { ServerProvider, useServerState } from '../context/ServerContext';
import { ThemeToggle } from '../components/ThemeToggle';

// Test consumer for ThemeContext
const ThemeConsumer: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
    </div>
  );
};

// Test consumer for ServerContext
const ServerThemeConsumer: React.FC = () => {
  const { theme, toggleTheme } = useServerState();
  return (
    <div>
      <span data-testid="server-theme-val">{theme}</span>
      <button onClick={toggleTheme}>Server Toggle</button>
    </div>
  );
};

describe('Dark/Light Mode Theme Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to dark mode when no preference is stored', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('reads initial preference from localStorage when available', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-val').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles theme between dark and light and synchronizes HTML class and localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Toggle to light
    act(() => {
      fireEvent.click(screen.getByText('Toggle'));
    });

    expect(screen.getByTestId('theme-val').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    // Toggle back to dark
    act(() => {
      fireEvent.click(screen.getByText('Toggle'));
    });

    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('exposes theme and toggleTheme through ServerContext', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ServerProvider>
            <ServerThemeConsumer />
          </ServerProvider>
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('server-theme-val').textContent).toBe('dark');

    await act(async () => {
      fireEvent.click(screen.getByText('Server Toggle'));
    });

    expect(screen.getByTestId('server-theme-val').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders ThemeToggle in header and sidebar variants and responds to clicks', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ServerProvider>
            <div>
              <ThemeToggle variant="header" />
              <ThemeToggle variant="sidebar" isCollapsed={false} />
              <ThemeToggle variant="sidebar" isCollapsed={true} />
            </div>
          </ServerProvider>
        </ThemeProvider>
      );
    });

    const toggleBtns = screen.getAllByRole('button', { name: /switch to (light|dark) mode/i });
    expect(toggleBtns.length).toBe(3);

    // Initial state is dark mode
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click header toggle
    await act(async () => {
      fireEvent.click(toggleBtns[0]);
    });

    // Should switch to light mode
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
