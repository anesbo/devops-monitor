import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ServerProvider } from '../context/ServerContext';
import { ToastProvider } from '../components/AlertToast';
import { OverviewView } from '../components/views/OverviewView';
import { NodesView } from '../components/views/NodesView';
import { AlertsView } from '../components/views/AlertsView';
import { LogsView } from '../components/views/LogsView';

beforeAll(() => {
  // Mock Web Audio API for jsdom
  window.AudioContext = vi.fn().mockImplementation(() => ({
    state: 'running',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue({
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: vi.fn().mockReturnValue({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
    destination: {},
  }));

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ServerProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </ServerProvider>
  );
};

describe('Frontend Views Suite', () => {
  it('renders OverviewView with KPI cards and status sections', async () => {
    renderWithProviders(<OverviewView />);
    // Wait for nodes to load from mock API
    const title = await screen.findByText(/Unified Observability & Fleet Telemetry|Real-Time Global Observability/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/Total Nodes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cluster CPU Load/i)).toBeInTheDocument();
    expect(screen.getByText(/Cluster RAM Used/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Throughput/i)).toBeInTheDocument();
  });

  it('renders NodesView with search, filter controls, and grid explorer', async () => {
    renderWithProviders(<NodesView />);
    const title = await screen.findByText(/Server Node Explorer & Core Matrix/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by name, IP, region, tag.../i)).toBeInTheDocument();
    expect(screen.getByText(/Register Node/i)).toBeInTheDocument();
  });

  it('renders AlertsView with active alert rules and conditions log', async () => {
    renderWithProviders(<AlertsView />);
    const title = await screen.findByText(/Alert Rule Management & Trigger Log/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/Active Alert Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/New Alert Rule/i)).toBeInTheDocument();
  });

  it('renders LogsView with terminal stdout and simulate incident button', async () => {
    renderWithProviders(<LogsView />);
    const title = await screen.findByText(/Live Cluster Telemetry Logs & Incident Dispatcher/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/Simulate Incident/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Grep logs/i)).toBeInTheDocument();
  });
});
