import React, { useState, useCallback, useRef } from 'react';
import { CellOutput, DATAFRAME_MIME_TYPE } from '../../types';
import type {
  DataFrameMetadata,
  DataFrameColumnType,
  DataFramePagination as PaginationType,
} from '../../types';
import { DataFrameViewer } from './DataFrameViewer';

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
  /** Optional callbacks for DataFrame operations. Required if rendering DataFrames. */
  dataframeCallbacks?: DataFrameCallbacks;
}

function renderOutput(
  output: CellOutput,
  index: number,
  imageWidths?: Record<number, number>,
  onImageWidthChange?: (index: number, width: number) => void,
  dataframeCallbacks?: DataFrameCallbacks
): React.ReactNode {
  const { type, content, mimeType } = output;

  // Handle different MIME types for display outputs
  if (type === 'display' || type === 'result') {
    if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/gif') {
      return (
        <div key={index} className="output-item output-item--image">
          <ResizableImage
            src={`data:${mimeType};base64,${content}`}
            alt="Output"
            initialWidth={imageWidths?.[index]}
            onWidthChange={(width) => onImageWidthChange?.(index, width)}
          />
        </div>
      );
    }

    // Handle DataFrame MIME type - prioritize over text/html for pandas DataFrames
    if (mimeType === DATAFRAME_MIME_TYPE && dataframeCallbacks) {
      try {
        const metadata: DataFrameMetadata = JSON.parse(content);
        return (
          <DataFrameViewer
            key={index}
            metadata={metadata}
            onGetPage={dataframeCallbacks.onGetPage}
            onEditCell={dataframeCallbacks.onEditCell}
            onAddRow={dataframeCallbacks.onAddRow}
            onDeleteRow={dataframeCallbacks.onDeleteRow}
            onAddColumn={dataframeCallbacks.onAddColumn}
            onDeleteColumn={dataframeCallbacks.onDeleteColumn}
          />
        );
      } catch {
        // Fall back to JSON display if parsing fails
        return (
          <div key={index} className="output-item output-item--json">
            <pre>{content}</pre>
          </div>
        );
      }
    }

    if (mimeType === 'text/html') {
      return (
        <div
          key={index}
          className="output-item output-item--html"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    if (mimeType === 'application/json') {
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2);
        return (
          <div key={index} className="output-item output-item--json">
            <pre>{formatted}</pre>
          </div>
        );
      } catch {
        // Fall through to plain text
      }
    }

    // Default: render as plain text
    return (
      <div key={index} className="output-item output-item--result">
        <pre>{content}</pre>
      </div>
    );
  }

  // Handle stream outputs (stdout/stderr)
  if (type === 'stdout') {
    return (
      <div key={index} className="output-item output-item--stdout">
        <pre>{content}</pre>
      </div>
    );
  }

  if (type === 'stderr') {
    return (
      <div key={index} className="output-item output-item--stderr">
        <pre>{content}</pre>
      </div>
    );
  }

  // Handle errors with ANSI color stripping and formatting
  if (type === 'error') {
    // Strip ANSI escape codes for cleaner display
    const cleanContent = content.replace(
      // eslint-disable-next-line no-control-regex
      /\x1b\[[0-9;]*[a-zA-Z]/g,
      ''
    );

    return (
      <div key={index} className="output-item output-item--error">
        <pre>{cleanContent}</pre>
      </div>
    );
  }

  // Default fallback
  return (
    <div key={index} className={`output-item output-item--${type}`}>
      <pre>{content}</pre>
    </div>
  );
}

export function OutputArea({
  outputs,
  imageWidths,
  onImageWidthChange,
  dataframeCallbacks,
}: OutputAreaProps) {
  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="output-area">
      {outputs.map((output, index) =>
        renderOutput(output, index, imageWidths, onImageWidthChange, dataframeCallbacks)
      )}
    </div>
  );
}
