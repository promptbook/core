import React from 'react';
import { CellOutput } from '../../types';

interface OutputAreaProps {
  outputs: CellOutput[];
}

function renderOutput(output: CellOutput, index: number): React.ReactNode {
  const { type, content, mimeType } = output;

  // Handle different MIME types for display outputs
  if (type === 'display' || type === 'result') {
    if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/gif') {
      return (
        <div key={index} className="output-item output-item--image">
          <img
            src={`data:${mimeType};base64,${content}`}
            alt="Output"
          />
        </div>
      );
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

export function OutputArea({ outputs }: OutputAreaProps) {
  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="output-area">
      {outputs.map((output, index) => renderOutput(output, index))}
    </div>
  );
}
