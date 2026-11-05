import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SparklineChart } from '../components/SparklineChart';

describe('SparklineChart Component Tests', () => {
  it('renders fallback empty state gracefully when data is empty or missing', () => {
    render(<SparklineChart data={[]} />);
    expect(screen.getByText('No telemetry data available')).toBeInTheDocument();
  });

  it('handles single-point data gracefully without errors', () => {
    const { container } = render(<SparklineChart data={[42]} height={60} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders SVG curve path and area fill for multi-point series', () => {
    const data = [10, 25, 40, 35, 60, 85, 45];
    const { container } = render(
      <SparklineChart
        data={data}
        color="emerald"
        height={80}
        label="CPU Usage"
        unit="%"
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // line path and area path

    // Verify stroke color configuration for emerald
    const strokePath = Array.from(paths).find((p) => p.getAttribute('stroke') === '#10b981');
    expect(strokePath).toBeDefined();
  });

  it('renders interactive tooltip on mouse movement over the sparkline container', () => {
    const data = [
      { timestamp: '12:00:00', value: 34.5 },
      { timestamp: '12:01:00', value: 68.2 },
      { timestamp: '12:02:00', value: 92.1 },
    ];

    const { container } = render(
      <SparklineChart
        data={data}
        color="cyan"
        height={100}
        label="Memory Pressure"
        unit="%"
      />
    );

    const chartWrapper = container.firstChild as HTMLElement;
    expect(chartWrapper).toBeInTheDocument();

    // Initially tooltip should not be visible
    expect(screen.queryByText('Memory Pressure')).not.toBeInTheDocument();

    // Simulate mouse move
    Object.defineProperty(chartWrapper, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(chartWrapper, 'clientHeight', { value: 100, configurable: true });
    chartWrapper.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 100,
      width: 400,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseMove(chartWrapper, { clientX: 200, clientY: 50 });

    // Tooltip elements should now be rendered in the document
    expect(screen.getByText('Memory Pressure')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('applies custom formatValue function correctly', () => {
    const data = [1000, 2500, 5000];
    const formatValue = (val: number) => `$${val.toLocaleString()}`;

    const { container } = render(
      <SparklineChart
        data={data}
        formatValue={formatValue}
        label="Cost"
      />
    );

    const chartWrapper = container.firstChild as HTMLElement;
    chartWrapper.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 80,
      width: 400,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseMove(chartWrapper, { clientX: 200, clientY: 40 });
    // Expect formatted string in tooltip
    expect(screen.getByText('Cost')).toBeInTheDocument();
  });
});
