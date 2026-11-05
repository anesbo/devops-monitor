import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge Component Tests', () => {
  it('renders online status with emerald theme and active ping animation', () => {
    const { container } = render(<StatusBadge status="online" />);

    expect(screen.getByText('ONLINE')).toBeInTheDocument();

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-emerald-400');
    expect(badge.className).toContain('bg-emerald-500/10');

    // Ping animation dot should exist for active online status
    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeInTheDocument();
    expect(pingDot?.className).toContain('bg-emerald-400');
  });

  it('renders degraded status with amber theme and active ping animation', () => {
    const { container } = render(<StatusBadge status="degraded" />);

    expect(screen.getByText('DEGRADED')).toBeInTheDocument();

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-amber-400');
    expect(badge.className).toContain('bg-amber-500/10');

    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeInTheDocument();
    expect(pingDot?.className).toContain('bg-amber-400');
  });

  it('renders critical status with rose theme and active ping animation', () => {
    const { container } = render(<StatusBadge status="critical" />);

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-rose-400');
    expect(badge.className).toContain('bg-rose-500/10');

    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeInTheDocument();
    expect(pingDot?.className).toContain('bg-rose-400');
  });

  it('renders offline status with slate theme and disables ping animation', () => {
    const { container } = render(<StatusBadge status="offline" />);

    expect(screen.getByText('OFFLINE')).toBeInTheDocument();

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-slate-400');
    expect(badge.className).toContain('bg-slate-800/60');

    // Offline nodes do not pulse/ping
    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeNull();
  });

  it('allows overriding display label and disabling pulse explicitly', () => {
    const { container } = render(
      <StatusBadge status="online" label="HOST ACTIVE" showPulse={false} />
    );

    expect(screen.getByText('HOST ACTIVE')).toBeInTheDocument();
    const pingDot = container.querySelector('.animate-ping');
    expect(pingDot).toBeNull();
  });

  it('supports size variations (sm, md, lg)', () => {
    const { container: smContainer } = render(<StatusBadge status="online" size="sm" />);
    expect((smContainer.firstChild as HTMLElement).className).toContain('text-[10px]');

    const { container: lgContainer } = render(<StatusBadge status="online" size="lg" />);
    expect((lgContainer.firstChild as HTMLElement).className).toContain('text-sm');
  });
});
