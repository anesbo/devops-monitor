import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertModal } from '../components/AlertModal';
import { AlertRule, AlertMetricType } from '../types';

describe('AlertModal Component Tests', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AlertModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header, metric options, threshold input, and severity pills when open', () => {
    render(
      <AlertModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
    );

    expect(screen.getByText('Create Threshold Alert Rule')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('RAM Usage')).toBeInTheDocument();
    expect(screen.getByText('Network I/O Throughput')).toBeInTheDocument();
    expect(screen.getByText('Container Failures')).toBeInTheDocument();
    expect(screen.getByText('Save Alert Rule')).toBeInTheDocument();
  });

  it('validates required title field and displays error message on empty submit', async () => {
    const handleSave = vi.fn();
    render(
      <AlertModal isOpen={true} onClose={vi.fn()} onSave={handleSave} />
    );

    const submitBtn = screen.getByRole('button', { name: /Save Alert Rule/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Rule title / name is required.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('selects metric, adjusts threshold, fills title, and successfully submits form', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <AlertModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Enter title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Critical CPU Burst/i);
    fireEvent.change(titleInput, { target: { value: 'High RAM Pressure Alert' } });

    // Select RAM metric
    const ramButton = screen.getByRole('button', { name: /RAM Usage/i });
    fireEvent.click(ramButton);

    // Select Critical severity
    const criticalButton = screen.getByRole('button', { name: /Critical/i });
    fireEvent.click(criticalButton);

    // Adjust numeric threshold
    const numberInputs = screen.getAllByRole('spinbutton');
    const thresholdInput = numberInputs[0];
    fireEvent.change(thresholdInput, { target: { value: '92' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Save Alert Rule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedPayload = handleSave.mock.calls[0][0];
    expect(savedPayload.name).toBe('High RAM Pressure Alert');
    expect(savedPayload.metricName).toBe('ram');
    expect(savedPayload.severity).toBe('critical');
    expect(savedPayload.threshold).toBe(92);
    expect(savedPayload.isActive).toBe(true);
    expect(handleClose).toHaveBeenCalled();
  });

  it('populates initialRule data when editing an existing rule', () => {
    const existingRule: AlertRule = {
      id: 'rule-test-existing',
      name: 'Existing Database Latency Rule',
      nodeId: 'node-eu-west-1',
      nodeName: 'eu-west-db-replica-02',
      metricName: 'network' as AlertMetricType,
      operator: '>=',
      threshold: 650,
      severity: 'critical',
      isActive: true,
      duration: '5m',
      createdAt: Date.now(),
    };

    render(
      <AlertModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialRule={existingRule}
      />
    );

    expect(screen.getByText('Configure Alert Rule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Database Latency Rule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Rule/i })).toBeInTheDocument();
  });
});
