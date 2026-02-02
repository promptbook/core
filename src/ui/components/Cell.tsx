import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CellState, CodeCellTab, AIAssistanceMessage } from '../../types';
import { DescriptionEditor } from './DescriptionEditor';
import { CodeEditor } from './CodeEditor';
import { OutputArea, DataFrameCallbacks, ResearchCallbacks } from './OutputArea';
import { AIAssistancePanel } from './AIAssistancePanel';
import { ThinkingPanel } from './ThinkingPanel';
import { useCellResize } from '../hooks/useCellResize';
import { FileEntry } from './FileAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';

/** AI Assistance props for the cell */
interface AIAssistanceProps {
  messages: AIAssistanceMessage[];
  isLoading: boolean;
  onSendMessage: (content: string, currentCode: string) => void;
  clearHistory: () => void;
}

interface CellProps {
  cell: CellState;
  /** 1-based index of the cell in the notebook */
  cellIndex: number;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRun: (cellId: string) => void;
  onSync: (cellId: string) => void;
  isActive?: boolean;
  onFocus?: (cellId: string) => void;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  /** Function to get kernel symbols for # autocomplete (fallback if no preloaded symbols) */
  getSymbols?: () => Promise<KernelSymbol[]>;
  /** Pre-loaded symbols from LLM code generation - preferred over kernel symbols */
  preloadedSymbols?: KernelSymbol[];
  /** AI Assistance functionality */
  aiAssistance?: AIAssistanceProps;
  /** Callbacks for DataFrame operations (required for interactive DataFrame display) */
  dataframeCallbacks?: DataFrameCallbacks;
  /** Callbacks for research assistance features */
  researchCallbacks?: ResearchCallbacks;
}

// Utility to escape regex special characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get preview text for collapsed state
function getCollapsedPreview(activeTab: CodeCellTab, cell: CellState): string {
  if (activeTab === 'code' && cell.code) {
    return cell.code.split('\n')[0].slice(0, 80) + (cell.code.length > 80 ? '...' : '');
  }
  if (activeTab === 'short' && cell.shortDescription) {
    return cell.shortDescription.slice(0, 80) + (cell.shortDescription.length > 80 ? '...' : '');
  }
  if (activeTab === 'pseudo' && cell.pseudoCode) {
    return cell.pseudoCode.slice(0, 80) + (cell.pseudoCode.length > 80 ? '...' : '');
  }
  return 'Empty cell';
}

// Calculate parameter updates across all tabs
function calculateParameterUpdates(
  cell: CellState,
  paramName: string,
  oldValue: string,
  newValue: string
): Partial<CellState> {
  const updates: Partial<CellState> = {};
  const valueRegex = new RegExp(escapeRegex(oldValue), 'g');

  if (cell.code) updates.code = cell.code.replace(valueRegex, newValue);

  const paramRegex = (name: string, val: string) =>
    new RegExp(`\\{\\{${escapeRegex(name)}:${escapeRegex(val)}\\}\\}`, 'g');

  if (cell.shortDescription) {
    updates.shortDescription = cell.shortDescription.replace(paramRegex(paramName, oldValue), `{{${paramName}:${newValue}}}`);
  }
  if (cell.pseudoCode) {
    updates.pseudoCode = cell.pseudoCode.replace(paramRegex(paramName, oldValue), `{{${paramName}:${newValue}}}`);
  }

  return updates;
}

// Collapse icons
const CollapseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4.5l3 3 3-3" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4.5 3l3 3-3 3" />
  </svg>
);

export function Cell({ cell, cellIndex, onUpdate, onRun, onSync, isActive, onFocus, listFiles, getSymbols, preloadedSymbols, aiAssistance, dataframeCallbacks, researchCallbacks }: CellProps) {
  const [activeTab, setActiveTab] = useState<CodeCellTab>(cell.lastEditedTab || 'short');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const { isResizing, contentHeight, handleResizeStart } = useCellResize({
    initialHeight: cell.height, onHeightChange: useCallback((h: number) => onUpdate(cell.id, { height: h }), [cell.id, onUpdate]),
  });

  const toggleInputCollapse = useCallback(() => onUpdate(cell.id, { isInputCollapsed: !cell.isInputCollapsed }), [cell.id, cell.isInputCollapsed, onUpdate]);
  const toggleOutputCollapse = useCallback(() => onUpdate(cell.id, { isOutputCollapsed: !cell.isOutputCollapsed }), [cell.id, cell.isOutputCollapsed, onUpdate]);

  const handleTabChange = (tab: CodeCellTab) => { if (cell.isDirty && tab !== activeTab) onSync(cell.id); setActiveTab(tab); onUpdate(cell.id, { lastEditedTab: tab }); };
  const handleShortChange = (c: string) => onUpdate(cell.id, { shortDescription: c, lastEditedTab: 'short', isDirty: true });
  const handlePseudoChange = (c: string) => onUpdate(cell.id, { pseudoCode: c, lastEditedTab: 'pseudo', isDirty: true });
  const handleCodeChange = (c: string) => onUpdate(cell.id, { code: c, lastEditedTab: 'code', isDirty: true });
  const handleParamChange = (p: string, o: string, n: string) => { const u = calculateParameterUpdates(cell, p, o, n); if (Object.keys(u).length) onUpdate(cell.id, u); };

  const cls = `cell ${cell.isExecuting ? 'cell--executing' : ''} ${cell.isSyncing ? 'cell--syncing' : ''} ${isActive ? 'cell--active' : ''} ${cell.isInputCollapsed ? 'cell--input-collapsed' : ''}`;

  return (
    <div ref={cellRef} className={cls} onClick={() => onFocus?.(cell.id)} tabIndex={0} onFocus={() => onFocus?.(cell.id)}>
      <CellToolbar activeTab={activeTab} onTabChange={handleTabChange} isDirty={cell.isDirty} isSyncing={cell.isSyncing} isExecuting={cell.isExecuting}
        onSync={() => onSync(cell.id)} onRun={() => onRun(cell.id)} executionStartTime={cell.executionStartTime} lastExecutionTime={cell.lastExecutionTime}
        lastExecutionSuccess={cell.lastExecutionSuccess} executionCount={cell.executionCount} isInputCollapsed={cell.isInputCollapsed} onToggleInputCollapse={toggleInputCollapse}
        isSyncingInBackground={cell.isSyncingInBackground} backgroundSyncError={cell.backgroundSyncError} showAiPanel={showAiPanel}
        onToggleAiPanel={() => setShowAiPanel(!showAiPanel)} hasAiAssistance={!!aiAssistance} />
      {cell.isInputCollapsed ? (
        <div className="cell-collapsed-preview" onClick={toggleInputCollapse}>
          <span className="cell-collapsed-preview__text">{getCollapsedPreview(activeTab, cell)}</span>
          <span className="cell-collapsed-preview__hint">Click to expand</span>
        </div>
      ) : (<>
        <CellContent activeTab={activeTab} cell={cell} contentHeight={contentHeight} onShortChange={handleShortChange} onPseudoChange={handlePseudoChange}
          onCodeChange={handleCodeChange} onParameterChange={handleParamChange} listFiles={listFiles} getSymbols={getSymbols} preloadedSymbols={preloadedSymbols}
          showAiPanel={showAiPanel} onCloseAiPanel={() => setShowAiPanel(false)} aiAssistance={aiAssistance} syncStartTime={cell.syncStartTime} />
        <div className={`cell-resize-handle ${isResizing ? 'cell-resize-handle--active' : ''}`} onMouseDown={handleResizeStart}><div className="cell-resize-handle__grip" /></div>
      </>)}
      {cell.outputs.length > 0 && (
        <div className={`cell-output ${cell.isOutputCollapsed ? 'cell-output--collapsed' : ''}`}>
          <div className="cell-output-header" onClick={toggleOutputCollapse}>
            <span className="cell-output-header__icon">{cell.isOutputCollapsed ? <ExpandIcon /> : <CollapseIcon />}</span>
            <span className="cell-output-header__label">Output [{cellIndex}]</span>
            {cell.isOutputCollapsed && <span className="cell-output-header__preview">{cell.outputs[0]?.content.slice(0, 50)}...</span>}
          </div>
          {!cell.isOutputCollapsed && <OutputArea outputs={cell.outputs} dataframeCallbacks={dataframeCallbacks} code={cell.code} description={cell.shortDescription} researchCallbacks={researchCallbacks} />}
        </div>
      )}
      {cell.lastSyncThinking && (
        <ThinkingPanel
          thinking={cell.lastSyncThinking}
          timestamp={cell.lastSyncTimestamp}
          isCollapsed={cell.isThinkingCollapsed}
          onToggleCollapse={() => onUpdate(cell.id, { isThinkingCollapsed: !cell.isThinkingCollapsed })}
        />
      )}
    </div>
  );
}

// Sub-components to reduce main function size
interface CellToolbarProps {
  activeTab: CodeCellTab;
  onTabChange: (tab: CodeCellTab) => void;
  isDirty: boolean;
  isSyncing: boolean;
  isExecuting: boolean;
  onSync: () => void;
  onRun: () => void;
  executionStartTime?: number;
  lastExecutionTime?: number;
  lastExecutionSuccess?: boolean;
  executionCount?: number;
  isInputCollapsed?: boolean;
  onToggleInputCollapse: () => void;
  isSyncingInBackground?: boolean;
  backgroundSyncError?: string;
  showAiPanel?: boolean;
  onToggleAiPanel?: () => void;
  hasAiAssistance?: boolean;
}

// AI Icon component
const AIIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path d="M6 0L7.5 3.5L11 4L8.5 6.5L9 10L6 8L3 10L3.5 6.5L1 4L4.5 3.5L6 0Z" />
  </svg>
);

function CellToolbar({ activeTab, onTabChange, isDirty, isSyncing, isExecuting, onSync, onRun, executionStartTime, lastExecutionTime, lastExecutionSuccess, executionCount, isInputCollapsed, onToggleInputCollapse, isSyncingInBackground, backgroundSyncError, showAiPanel, onToggleAiPanel, hasAiAssistance }: CellToolbarProps) {
  return (
    <div className="cell-toolbar">
      <div className="cell-toolbar-left">
        <button
          className="cell-collapse-btn"
          onClick={(e) => { e.stopPropagation(); onToggleInputCollapse(); }}
          title={isInputCollapsed ? 'Expand cell' : 'Collapse cell'}
          aria-label={isInputCollapsed ? 'Expand cell' : 'Collapse cell'}
        >
          {isInputCollapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
        <div className="cell-tabs" role="tablist">
          <button role="tab" aria-selected={activeTab === 'short'} onClick={() => onTabChange('short')}>Instructions</button>
          <button role="tab" aria-selected={activeTab === 'pseudo'} onClick={() => onTabChange('pseudo')}>Detailed</button>
          <button role="tab" aria-selected={activeTab === 'code'} onClick={() => onTabChange('code')}>Code</button>
        </div>
      </div>
      <div className="cell-actions">
        <ExecutionStatus isExecuting={isExecuting} executionStartTime={executionStartTime} lastExecutionTime={lastExecutionTime} lastExecutionSuccess={lastExecutionSuccess} executionCount={executionCount} />
        {isSyncingInBackground && (
          <span className="cell-background-sync-indicator" title="Updating instructions in background">
            <span className="cell-background-sync-spinner" />
            Updating...
          </span>
        )}
        {backgroundSyncError && (
          <span className="cell-background-sync-error" title={backgroundSyncError}>
            ⚠
          </span>
        )}
        {activeTab === 'code' && hasAiAssistance && onToggleAiPanel && (
          <button
            className={`ai-assist-toggle-btn ${showAiPanel ? 'active' : ''}`}
            onClick={onToggleAiPanel}
            aria-label="AI Assistant"
            title="Open AI Assistant"
          >
            <AIIcon /> AI
          </button>
        )}
        {isDirty && !isSyncing && !isSyncingInBackground && <button onClick={onSync} aria-label="Sync">Sync</button>}
        {isSyncing && (
          <button disabled className="cell-syncing-btn">
            <span className="cell-syncing-spinner" />
            Syncing...
          </button>
        )}
        <button onClick={onRun} disabled={isExecuting || isSyncing} aria-label="Run">
          {isExecuting ? 'Running...' : '▶ Run'}
        </button>
      </div>
    </div>
  );
}

// Execution status with live timer
interface ExecutionStatusProps {
  isExecuting: boolean;
  executionStartTime?: number;
  lastExecutionTime?: number;
  lastExecutionSuccess?: boolean;
  executionCount?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function ExecutionStatus({ isExecuting, executionStartTime, lastExecutionTime, lastExecutionSuccess, executionCount }: ExecutionStatusProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isExecuting || !executionStartTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - executionStartTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, executionStartTime]);

  if (isExecuting) {
    return (
      <span className="execution-status execution-status--running">
        <span className="execution-status__spinner" />
        <span className="execution-status__time">{formatDuration(elapsed)}</span>
      </span>
    );
  }

  if (lastExecutionTime !== undefined && lastExecutionSuccess !== undefined) {
    const statusClass = lastExecutionSuccess ? 'execution-status--success' : 'execution-status--error';
    const icon = lastExecutionSuccess ? '✓' : '✗';
    return (
      <span className={`execution-status ${statusClass}`} title={`Execution ${executionCount || ''}: ${formatDuration(lastExecutionTime)}`}>
        <span className="execution-status__icon">{icon}</span>
        <span className="execution-status__time">{formatDuration(lastExecutionTime)}</span>
      </span>
    );
  }

  return null;
}

interface CellContentProps {
  activeTab: CodeCellTab;
  cell: CellState;
  contentHeight: number;
  onShortChange: (content: string) => void;
  onPseudoChange: (content: string) => void;
  onCodeChange: (code: string) => void;
  onParameterChange: (paramName: string, oldValue: string, newValue: string) => void;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
  preloadedSymbols?: KernelSymbol[];
  showAiPanel?: boolean;
  onCloseAiPanel?: () => void;
  aiAssistance?: AIAssistanceProps;
  syncStartTime?: number;
}

function CellContent({ activeTab, cell, contentHeight, onShortChange, onPseudoChange, onCodeChange, onParameterChange, listFiles, getSymbols, preloadedSymbols, showAiPanel, onCloseAiPanel, aiAssistance, syncStartTime }: CellContentProps) {
  const editorHeight = contentHeight - 32;

  // Wrap the send message to include current code
  const handleSendMessage = useCallback((content: string) => {
    if (aiAssistance?.onSendMessage) {
      aiAssistance.onSendMessage(content, cell.code);
    }
  }, [aiAssistance, cell.code]);

  // Handle applying AI-suggested code
  const handleApplyCode = useCallback((code: string) => {
    onCodeChange(code);
  }, [onCodeChange]);

  return (
    <div className="cell-content" style={{ minHeight: `${contentHeight}px` }}>
      {activeTab === 'short' && (
        <DescriptionEditor content={cell.shortDescription} onChange={onShortChange} onParameterChange={onParameterChange} placeholder="Brief description of what this code does..." isSyncing={cell.isSyncing} syncStartTime={syncStartTime} minHeight={editorHeight} listFiles={listFiles} getSymbols={getSymbols} preloadedSymbols={preloadedSymbols} streamingContent={cell.streamingContent} streamingThinking={cell.streamingThinking} />
      )}
      {activeTab === 'pseudo' && (
        <DescriptionEditor content={cell.pseudoCode} onChange={onPseudoChange} onParameterChange={onParameterChange} placeholder="Detailed step-by-step instructions explaining the logic..." isSyncing={cell.isSyncing} syncStartTime={syncStartTime} minHeight={editorHeight} listFiles={listFiles} getSymbols={getSymbols} preloadedSymbols={preloadedSymbols} streamingContent={cell.streamingContent} streamingThinking={cell.streamingThinking} />
      )}
      {activeTab === 'code' && (
        <div className={`cell-code-wrapper ${showAiPanel ? 'cell-code-with-ai' : ''}`}>
          {cell.isSyncing && (
            <div className="cell-sync-overlay">
              <div className="cell-sync-overlay__content">
                <span className="cell-sync-overlay__spinner" />
                <span>Generating code...</span>
              </div>
              {(cell.streamingContent || cell.streamingThinking) && (
                <div className="cell-sync-overlay__streaming">
                  {cell.streamingThinking && (
                    <div className="cell-sync-overlay__thinking">
                      <span className="cell-sync-overlay__thinking-label">Thinking...</span>
                      <pre className="cell-sync-overlay__thinking-text">{cell.streamingThinking.slice(-500)}</pre>
                    </div>
                  )}
                  {cell.streamingContent && (
                    <div className="cell-sync-overlay__response">
                      <span className="cell-sync-overlay__response-label">Generating:</span>
                      <pre className="cell-sync-overlay__response-text">{cell.streamingContent.slice(-300)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className={showAiPanel ? 'cell-code-editor-section' : ''}>
            <CodeEditor code={cell.code} onChange={onCodeChange} readOnly={cell.isExecuting || cell.isSyncing} height={contentHeight} />
          </div>
          {showAiPanel && aiAssistance && (
            <div className="cell-ai-panel-section">
              <AIAssistancePanel
                messages={aiAssistance.messages}
                isLoading={aiAssistance.isLoading}
                onSendMessage={handleSendMessage}
                onApplyCode={handleApplyCode}
                onClose={onCloseAiPanel || (() => {})}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
