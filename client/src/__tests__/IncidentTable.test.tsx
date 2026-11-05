import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncidentTable } from '../components/IncidentTable';
import { Incident } from '../types';

const mockIncidents: Incident[] = [
  {
    id: 'inc-01',
    nodeId: 'node-us-east-1',
    nodeName: 'us-east-prod-api-01',
    title: 'High CPU Sustained Over 92%',
    description: 'CPU load exceeded 90% threshold across 16 cores.',
    severity: 'critical',
    status: 'open',
    timestamp: Date.now() - 5 * 60 * 1000,
    metricType: 'cpu',
    currentValue: '94.2%',
    threshold: '85.0%',
  },
  {
    id: 'inc-02',
    nodeId: 'node-eu-west-1',
    nodeName: 'eu-west-db-replica-02',
    title: 'PostgreSQL Buffer Cache Pressure',
    description: 'Shared memory buffer pool exhaustion.',
    severity: 'warning',
    status: 'investigating',
    timestamp: Date.now() - 30 * 60 * 1000,
    metricType: 'ram',
    currentValue: '91.4%',
    threshold: '90.0%',
  },
  {
    id: 'inc-03',
    nodeId: 'node-us-west-2',
    nodeName: 'us-west-worker-04',
    title: 'Storage Tier Disk Space Reclaimed',
    description: 'Log partition cleanup completed successfully.',
    severity: 'info',
    status: 'resolved',
    timestamp: Date.now() - 120 * 60 * 1000,
    resolvedAt: Date.now() - 60 * 60 * 1000,
    metricType: 'disk',
    currentValue: '62.0%',
    threshold: '80.0%',
  },
];

describe('IncidentTable Component Tests', () => {
  it('renders table headers and incident rows', () => {
    render(<IncidentTable incidents={mockIncidents} />);

    expect(screen.getByText('Incident Audit Log')).toBeInTheDocument();
    expect(screen.getByText('High CPU Sustained Over 92%')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Buffer Cache Pressure')).toBeInTheDocument();
    expect(screen.getByText('Storage Tier Disk Space Reclaimed')).toBeInTheDocument();
  });

  it('filters incidents correctly based on live search query in title, description, and node', () => {
    render(<IncidentTable incidents={mockIncidents} />);

    const searchInput = screen.getByPlaceholderText(/Search by incident title/i);

    // Search for "PostgreSQL"
    fireEvent.change(searchInput, { target: { value: 'PostgreSQL' } });
    expect(screen.getByText('PostgreSQL Buffer Cache Pressure')).toBeInTheDocument();
    expect(screen.queryByText('High CPU Sustained Over 92%')).not.toBeInTheDocument();
    expect(screen.queryByText('Storage Tier Disk Space Reclaimed')).not.toBeInTheDocument();

    // Search for "us-west-worker"
    fireEvent.change(searchInput, { target: { value: 'us-west-worker' } });
    expect(screen.getByText('Storage Tier Disk Space Reclaimed')).toBeInTheDocument();
    expect(screen.queryByText('PostgreSQL Buffer Cache Pressure')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('High CPU Sustained Over 92%')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Buffer Cache Pressure')).toBeInTheDocument();
  });

  it('filters incidents correctly using the severity selector tabs', () => {
    render(<IncidentTable incidents={mockIncidents} />);

    // Click CRITICAL filter tab
    const criticalTab = screen.getByRole('button', { name: 'CRITICAL' });
    fireEvent.click(criticalTab);

    expect(screen.getByText('High CPU Sustained Over 92%')).toBeInTheDocument();
    expect(screen.queryByText('PostgreSQL Buffer Cache Pressure')).not.toBeInTheDocument();
    expect(screen.queryByText('Storage Tier Disk Space Reclaimed')).not.toBeInTheDocument();

    // Click WARNING filter tab
    const warningTab = screen.getByRole('button', { name: 'WARNING' });
    fireEvent.click(warningTab);

    expect(screen.queryByText('High CPU Sustained Over 92%')).not.toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Buffer Cache Pressure')).toBeInTheDocument();
    expect(screen.queryByText('Storage Tier Disk Space Reclaimed')).not.toBeInTheDocument();

    // Click ALL tab to reset
    const allTab = screen.getByRole('button', { name: 'ALL' });
    fireEvent.click(allTab);

    expect(screen.getByText('High CPU Sustained Over 92%')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Buffer Cache Pressure')).toBeInTheDocument();
    expect(screen.getByText('Storage Tier Disk Space Reclaimed')).toBeInTheDocument();
  });

  it('displays empty state message when no incidents match the search criteria', () => {
    render(<IncidentTable incidents={mockIncidents} />);

    const searchInput = screen.getByPlaceholderText(/Search by incident title/i);
    fireEvent.change(searchInput, { target: { value: 'non-existent-query-string' } });

    expect(screen.getByText('No Incidents Found')).toBeInTheDocument();
  });

  it('calls onAcknowledge and onResolve callback handlers', async () => {
    const handleAck = vi.fn();
    const handleResolve = vi.fn();

    render(
      <IncidentTable
        incidents={mockIncidents}
        onAcknowledge={handleAck}
        onResolve={handleResolve}
      />
    );

    // Find Ack button on open incident
    const ackButton = screen.getByRole('button', { name: /Ack/i });
    await fireEvent.click(ackButton);
    expect(handleAck).toHaveBeenCalledWith('inc-01');

    // Find Resolve button
    const resolveButtons = screen.getAllByRole('button', { name: /Resolve/i });
    await fireEvent.click(resolveButtons[0]);
    expect(handleResolve).toHaveBeenCalled();
  });
});
