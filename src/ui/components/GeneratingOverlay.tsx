import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Calculate popup position when streaming content appears
  useEffect(() => {
    if (isVisible && (streamingContent || streamingThinking) && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      // Position popup below the spinner, centered
      setPopupPosition({
        top: rect.top + 80, // Below the spinner area
        left: rect.left + rect.width / 2 - 250, // Centered (popup is 500px wide)
      });
    } else {
      setPopupPosition(null);
    }
  }, [isVisible, streamingContent, streamingThinking]);

  if (!isVisible) return null;

  const overlayClass = isBackground
    ? 'generating-overlay generating-overlay--background'
    : 'generating-overlay';

  const hasStreamingContent = streamingContent || streamingThinking;

  // Render streaming popup in a portal so it escapes overflow:hidden
  const streamingPopup = hasStreamingContent && popupPosition && createPortal(
    <div
      className="generating-overlay__streaming-popup"
      style={{
        top: Math.max(10, popupPosition.top),
        left: Math.max(10, Math.min(popupPosition.left, window.innerWidth - 520)),
      }}
    >
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
    </div>,
    document.body
  );

  return (
    <>
      <div ref={overlayRef} className={overlayClass}>
        <div className="generating-overlay__content">
          <div className="generating-overlay__spinner" />
          <span className="generating-overlay__message">{message}</span>
          {startTime && elapsed > 0 && (
            <span className="generating-overlay__time">{formatElapsedTime(elapsed)}</span>
          )}
        </div>
      </div>
      {streamingPopup}
    </>
  );
}
