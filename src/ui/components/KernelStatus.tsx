import React from 'react';
import { KernelState } from '../../kernel/KernelManager';
import { PythonEnvironment } from '../../kernel/PythonSetup';

interface KernelStatusProps {
  status: KernelState;
  environment: PythonEnvironment | null;
  onClick: () => void;
  onInterrupt?: () => void;
  onRestart?: () => void;
}

const statusColors: Record<KernelState, string> = {
  idle: '#22c55e',       // green
  busy: '#eab308',       // yellow
  starting: '#3b82f6',   // blue
  dead: '#ef4444',       // red
  disconnected: '#6b7280', // gray
};

const statusLabels: Record<KernelState, string> = {
  idle: 'Connected',
  busy: 'Running',
  starting: 'Starting',
  dead: 'Disconnected',
  disconnected: 'No kernel',
};

export function KernelStatus({
  status,
  environment,
  onClick,
  onInterrupt,
  onRestart,
}: KernelStatusProps) {
  const color = statusColors[status];
  const label = statusLabels[status];
  const envName = environment?.name || 'Select Python';

  return (
    <div className="kernel-status">
      <button
        className="kernel-status__button"
        onClick={onClick}
        title={environment ? `${envName} (${environment.version})` : 'Click to select Python environment'}
      >
        <span
          className={`kernel-status__dot kernel-status__dot--${status}`}
          style={{ backgroundColor: color }}
        />
        <span className="kernel-status__label">{envName}</span>
        <span className="kernel-status__state">{label}</span>
      </button>

      {status === 'busy' && onInterrupt && (
        <button
          className="kernel-status__action"
          onClick={(e) => {
            e.stopPropagation();
            onInterrupt();
          }}
          title="Interrupt execution"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="8" />
          </svg>
        </button>
      )}

      {(status === 'idle' || status === 'dead') && onRestart && environment && (
        <button
          className="kernel-status__action"
          onClick={(e) => {
            e.stopPropagation();
            onRestart();
          }}
          title="Restart kernel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 7a6 6 0 1 1 1.5 4" />
            <path d="M1 11V7h4" />
          </svg>
        </button>
      )}
    </div>
  );
}
