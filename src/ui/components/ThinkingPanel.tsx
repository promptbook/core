import React from 'react';

interface ThinkingPanelProps {
  /** The AI's thinking/reasoning from thinking_delta events */
  thinking?: string;
  /** Timestamp of the last sync */
  timestamp?: number;
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onToggleCollapse?: () => void;
}

/**
 * Panel to display the AI's thinking process from the last sync.
 * Only shows content from thinking_delta events (extended thinking).
 * Collapsed by default.
 */
export function ThinkingPanel({
  thinking,
  timestamp,
  isCollapsed = true,
  onToggleCollapse,
}: ThinkingPanelProps) {
  // Only show panel if we have actual thinking content
  if (!thinking) return null;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : '';

  return (
    <div className={`thinking-panel ${isCollapsed ? 'thinking-panel--collapsed' : ''}`}>
      <div className="thinking-panel__header" onClick={onToggleCollapse}>
        <span className="thinking-panel__icon">
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span className="thinking-panel__title">Thinking Process</span>
        {timestamp && (
          <span className="thinking-panel__time">{formattedTime}</span>
        )}
      </div>
      {!isCollapsed && (
        <div className="thinking-panel__content">
          <div className="thinking-panel__section">
            <pre className="thinking-panel__text">{thinking}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
