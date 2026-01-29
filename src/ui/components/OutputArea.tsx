import React from 'react';
import { CellOutput } from '../../types';

interface OutputAreaProps {
  outputs: CellOutput[];
}

export function OutputArea({ outputs }: OutputAreaProps) {
  return (
    <div className="output-area">
      {outputs.map((output, index) => (
        <div
          key={index}
          className={`output-item output-item--${output.type}`}
        >
          {output.type === 'display' && output.mimeType?.startsWith('image/') ? (
            <img src={`data:${output.mimeType};base64,${output.content}`} alt="Output" />
          ) : (
            <pre>{output.content}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
