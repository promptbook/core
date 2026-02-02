import React, { useState, useEffect } from 'react';

interface GeneratingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Timestamp when generation started (for elapsed time) */
  startTime?: number;
  /** Message to display (default: "Generating...") */
  message?: string;
  /** Whether this is a background operation (subtle styling) */
  isBackground?: boolean;
}

/** Format elapsed time in a human-readable way */
function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

/**
 * Overlay shown when LLM is generating content.
 * Displays a spinner, message, and elapsed time counter.
 */
export function GeneratingOverlay({ isVisible, startTime, message = 'Generating...', isBackground = false }: GeneratingOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isVisible || !startTime) {
      setElapsed(0);
      return;
    }

    // Update elapsed time every 100ms
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const overlayClass = isBackground
    ? 'generating-overlay generating-overlay--background'
    : 'generating-overlay';

  return (
    <div className={overlayClass}>
      <div className="generating-overlay__content">
        <div className="generating-overlay__spinner" />
        <span className="generating-overlay__message">{message}</span>
        {startTime && elapsed > 0 && (
          <span className="generating-overlay__time">{formatElapsedTime(elapsed)}</span>
        )}
      </div>
    </div>
  );
}
