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
  /** Streaming content from AI (displayed as it arrives) */
  streamingContent?: string;
  /** AI thinking/reasoning content */
  streamingThinking?: string;
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
export function GeneratingOverlay({ isVisible, startTime, message = 'Generating...', isBackground = false, streamingContent, streamingThinking }: GeneratingOverlayProps) {
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

  const hasStreamingContent = streamingContent || streamingThinking;

  return (
    <div className={overlayClass}>
      <div className="generating-overlay__content">
        <div className="generating-overlay__spinner" />
        <span className="generating-overlay__message">{message}</span>
        {startTime && elapsed > 0 && (
          <span className="generating-overlay__time">{formatElapsedTime(elapsed)}</span>
        )}
      </div>
      {hasStreamingContent && (
        <div className="generating-overlay__streaming">
          {streamingThinking && (
            <div className="generating-overlay__thinking">
              <span className="generating-overlay__label">Thinking...</span>
              <pre className="generating-overlay__text">{streamingThinking.slice(-500)}</pre>
            </div>
          )}
          {streamingContent && (
            <div className="generating-overlay__response">
              <span className="generating-overlay__label">Response:</span>
              <pre className="generating-overlay__text">{streamingContent.slice(-300)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
