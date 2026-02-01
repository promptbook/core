import React from 'react';

export type ResearchActionType = 'explain' | 'suggest' | 'debug' | 'papers';

export interface OutputActionsProps {
  /** Whether the cell has output */
  hasOutput: boolean;
  /** Whether the output contains an error */
  hasError: boolean;
  /** Handler for explain action */
  onExplain: () => void;
  /** Handler for suggest next steps action */
  onSuggestNext: () => void;
  /** Handler for debug action */
  onDebug: () => void;
  /** Handler for find papers action */
  onFindPapers: () => void;
  /** Whether an action is currently loading */
  isLoading: boolean;
  /** Which action is currently active/loading */
  activeAction: ResearchActionType | null;
}

// Icon components
const ExplainIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="6" r="4.5" />
    <path d="M6 4v2.5M6 8h.01" strokeLinecap="round" />
  </svg>
);

const SuggestIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 1v2M6 9v2M9 6h2M1 6h2" strokeLinecap="round" />
    <circle cx="6" cy="6" r="2" />
  </svg>
);

const DebugIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 2.5c-1.5 0-2.5 1-2.5 2.5v2c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5V5c0-1.5-1-2.5-2.5-2.5z" />
    <path d="M3.5 4h-2M10.5 4h-2M3.5 7h-2M10.5 7h-2M4.5 1.5l1 1M7.5 1.5l-1 1" strokeLinecap="round" />
  </svg>
);

const PapersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 1.5h5l2.5 2.5v6.5a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-8.5a.5.5 0 01.5-.5z" />
    <path d="M7.5 1.5v2.5h2.5" />
    <path d="M4 6h4M4 8h3" strokeLinecap="round" />
  </svg>
);

const LoadingSpinner = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" className="output-action-spinner">
    <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeLinecap="round" />
  </svg>
);

export function OutputActions({
  hasOutput,
  hasError,
  onExplain,
  onSuggestNext,
  onDebug,
  onFindPapers,
  isLoading,
  activeAction,
}: OutputActionsProps) {
  if (!hasOutput) return null;

  const renderButton = (
    action: ResearchActionType,
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    visible: boolean
  ) => {
    if (!visible) return null;

    const isActive = activeAction === action;
    const isDisabled = isLoading && !isActive;

    return (
      <button
        className={`output-action-btn ${isActive ? 'output-action-btn--active' : ''}`}
        onClick={onClick}
        disabled={isDisabled}
        title={label}
        aria-label={label}
      >
        {isActive && isLoading ? <LoadingSpinner /> : icon}
        <span className="output-action-btn__label">{label}</span>
      </button>
    );
  };

  return (
    <div className="output-actions">
      {renderButton('explain', 'Explain', <ExplainIcon />, onExplain, !hasError)}
      {renderButton('suggest', 'Suggest Next', <SuggestIcon />, onSuggestNext, !hasError)}
      {renderButton('debug', 'Debug', <DebugIcon />, onDebug, hasError)}
      {renderButton('papers', 'Find Papers', <PapersIcon />, onFindPapers, true)}
    </div>
  );
}
