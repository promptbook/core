import React, { useState, useCallback, useRef } from 'react';
import { CellOutput, DATAFRAME_MIME_TYPE } from '../../types';
import type {
  DataFrameMetadata,
  DataFrameColumnType,
  DataFramePagination as PaginationType,
} from '../../types';
import { DataFrameViewer } from './DataFrameViewer';
import { OutputActions, type ResearchActionType } from './OutputActions';
import { ResearchResultsPanel, type Paper } from './ResearchResultsPanel';

/** Callbacks for DataFrame operations */
export interface DataFrameCallbacks {
  onGetPage: (
    dfId: string,
    page: number,
    pageSize: number
  ) => Promise<{
    data: Record<string, unknown>[];
    pagination: PaginationType;
  } | null>;
  onEditCell: (
    dfId: string,
    rowIndex: number,
    column: string,
    value: unknown
  ) => Promise<boolean>;
  onAddRow: (dfId: string) => Promise<DataFrameMetadata | null>;
  onDeleteRow: (dfId: string, rowIndex: number) => Promise<DataFrameMetadata | null>;
  onAddColumn: (
    dfId: string,
    name: string,
    dtype: DataFrameColumnType
  ) => Promise<DataFrameMetadata | null>;
  onDeleteColumn: (dfId: string, column: string) => Promise<DataFrameMetadata | null>;
}

/** Callbacks for research assistance features */
export interface ResearchCallbacks {
  /** Explain the output */
  onExplain: (output: string, code: string) => Promise<string>;
  /** Suggest next analysis steps */
  onSuggestNext: (output: string, code: string, description: string) => Promise<string>;
  /** Debug an error */
  onDebug: (error: string, code: string) => Promise<string>;
  /** Find related papers */
  onFindPapers: (output: string, code: string) => Promise<Paper[]>;
  /** Apply a suggested code fix */
  onApplyFix?: (code: string) => void;
}

interface ResizableImageProps {
  src: string;
  alt: string;
  initialWidth?: number;
  onWidthChange?: (width: number) => void;
}

function ResizableImage({ src, alt, initialWidth, onWidthChange }: ResizableImageProps) {
  const [width, setWidth] = useState<number | undefined>(initialWidth);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    if (!width) {
      // Default to natural width, capped at container width
      const containerWidth = containerRef.current?.parentElement?.clientWidth ?? 800;
      setWidth(Math.min(img.naturalWidth, containerWidth - 40));
    }
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width ?? 400;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(100, startWidthRef.current + delta);
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onWidthChange]);

  // Calculate height to maintain aspect ratio
  const height = naturalSize && width
    ? (width / naturalSize.width) * naturalSize.height
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`resizable-image ${isResizing ? 'resizable-image--resizing' : ''}`}
      style={{ width: width ? `${width}px` : 'auto' }}
    >
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
        }}
      />
      <div
        className="resizable-image__handle"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

interface OutputAreaProps {
  outputs: CellOutput[];
  imageWidths?: Record<number, number>;
  onImageWidthChange?: (index: number, width: number) => void;
  dataframeCallbacks?: DataFrameCallbacks;
  code?: string;
  description?: string;
  researchCallbacks?: ResearchCallbacks;
}

/** Render display/result output (images, dataframes, html, json) */
function renderDisplayOutput(
  output: CellOutput, index: number,
  imageWidths?: Record<number, number>,
  onImageWidthChange?: (index: number, width: number) => void,
  dataframeCallbacks?: DataFrameCallbacks
): React.ReactNode {
  const { content, mimeType } = output;
  if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/gif') {
    return (
      <div key={index} className="output-item output-item--image">
        <ResizableImage src={`data:${mimeType};base64,${content}`} alt="Output"
          initialWidth={imageWidths?.[index]} onWidthChange={(w) => onImageWidthChange?.(index, w)} />
      </div>
    );
  }
  if (mimeType === DATAFRAME_MIME_TYPE && dataframeCallbacks) {
    try {
      const metadata: DataFrameMetadata = JSON.parse(content);
      return <DataFrameViewer key={index} metadata={metadata} onGetPage={dataframeCallbacks.onGetPage}
        onEditCell={dataframeCallbacks.onEditCell} onAddRow={dataframeCallbacks.onAddRow}
        onDeleteRow={dataframeCallbacks.onDeleteRow} onAddColumn={dataframeCallbacks.onAddColumn}
        onDeleteColumn={dataframeCallbacks.onDeleteColumn} />;
    } catch { return <div key={index} className="output-item output-item--json"><pre>{content}</pre></div>; }
  }
  if (mimeType === 'text/html') {
    return <div key={index} className="output-item output-item--html" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  if (mimeType === 'application/json') {
    try {
      return <div key={index} className="output-item output-item--json"><pre>{JSON.stringify(JSON.parse(content), null, 2)}</pre></div>;
    } catch { /* fall through */ }
  }
  return <div key={index} className="output-item output-item--result"><pre>{content}</pre></div>;
}

/** Strip ANSI escape codes from error output */
// eslint-disable-next-line no-control-regex
const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

/** Render a single output item */
function renderOutput(
  output: CellOutput, index: number, imageWidths?: Record<number, number>,
  onImageWidthChange?: (index: number, width: number) => void, dataframeCallbacks?: DataFrameCallbacks
): React.ReactNode {
  const { type, content } = output;
  if (type === 'display' || type === 'result') {
    return renderDisplayOutput(output, index, imageWidths, onImageWidthChange, dataframeCallbacks);
  }
  if (type === 'stdout') return <div key={index} className="output-item output-item--stdout"><pre>{content}</pre></div>;
  if (type === 'stderr') return <div key={index} className="output-item output-item--stderr"><pre>{content}</pre></div>;
  if (type === 'error') return <div key={index} className="output-item output-item--error"><pre>{stripAnsi(content)}</pre></div>;
  return <div key={index} className={`output-item output-item--${type}`}><pre>{content}</pre></div>;
}

/** Hook for research action state and handlers */
function useResearchActions(
  outputs: CellOutput[], code: string | undefined, description: string | undefined,
  researchCallbacks: ResearchCallbacks | undefined
) {
  const [activeAction, setActiveAction] = useState<ResearchActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [panelContent, setPanelContent] = useState<string | undefined>();
  const [panelPapers, setPanelPapers] = useState<Paper[] | undefined>();
  const [panelError, setPanelError] = useState<string | undefined>();
  const outputContent = outputs.map(o => o.content).join('\n');

  const closePanel = useCallback(() => {
    setActiveAction(null); setPanelContent(undefined); setPanelPapers(undefined); setPanelError(undefined);
  }, []);

  const runAction = useCallback(async (
    action: ResearchActionType,
    fn: () => Promise<string | Paper[]>
  ) => {
    setActiveAction(action); setIsLoading(true); setPanelError(undefined);
    try {
      const result = await fn();
      if (Array.isArray(result)) setPanelPapers(result); else setPanelContent(result);
    } catch (err) { setPanelError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setIsLoading(false); }
  }, []);

  const handleExplain = useCallback(() => {
    if (researchCallbacks?.onExplain) runAction('explain', () => researchCallbacks.onExplain(outputContent, code || ''));
  }, [researchCallbacks, runAction, outputContent, code]);

  const handleSuggestNext = useCallback(() => {
    if (researchCallbacks?.onSuggestNext) runAction('suggest', () => researchCallbacks.onSuggestNext(outputContent, code || '', description || ''));
  }, [researchCallbacks, runAction, outputContent, code, description]);

  const handleDebug = useCallback(() => {
    if (researchCallbacks?.onDebug) {
      const errOut = outputs.filter(o => o.type === 'error').map(o => o.content).join('\n');
      runAction('debug', () => researchCallbacks.onDebug(errOut, code || ''));
    }
  }, [researchCallbacks, runAction, outputs, code]);

  const handleFindPapers = useCallback(() => {
    if (researchCallbacks?.onFindPapers) runAction('papers', () => researchCallbacks.onFindPapers(outputContent, code || ''));
  }, [researchCallbacks, runAction, outputContent, code]);

  const handleApplyFix = useCallback((fixedCode: string) => {
    researchCallbacks?.onApplyFix?.(fixedCode); closePanel();
  }, [researchCallbacks, closePanel]);

  return { activeAction, isLoading, panelContent, panelPapers, panelError, closePanel,
    handleExplain, handleSuggestNext, handleDebug, handleFindPapers, handleApplyFix };
}

export function OutputArea({ outputs, imageWidths, onImageWidthChange, dataframeCallbacks, code, description, researchCallbacks }: OutputAreaProps) {
  const research = useResearchActions(outputs, code, description, researchCallbacks);
  const hasError = outputs.some(o => o.type === 'error');
  const hasOutput = outputs.length > 0;
  if (!hasOutput) return null;
  const showResearch = researchCallbacks && hasOutput;

  return (
    <div className="output-area">
      {outputs.map((output, index) => renderOutput(output, index, imageWidths, onImageWidthChange, dataframeCallbacks))}
      {showResearch && <OutputActions hasOutput={hasOutput} hasError={hasError} onExplain={research.handleExplain}
        onSuggestNext={research.handleSuggestNext} onDebug={research.handleDebug} onFindPapers={research.handleFindPapers}
        isLoading={research.isLoading} activeAction={research.activeAction} />}
      {research.activeAction && <ResearchResultsPanel type={research.activeAction} content={research.panelContent}
        papers={research.panelPapers} isLoading={research.isLoading} error={research.panelError}
        onClose={research.closePanel} onApplyFix={research.activeAction === 'debug' ? research.handleApplyFix : undefined} />}
    </div>
  );
}
