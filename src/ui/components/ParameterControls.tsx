import React from 'react';
import { Parameter } from '../../types';

interface ParameterControlsProps {
  parameter: Parameter;
  onChange: (value: string) => void;
}

export function ParameterControls({ parameter, onChange }: ParameterControlsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (parameter.type === 'number') {
    return (
      <div className="parameter-controls parameter-controls--number">
        <label>{parameter.name}</label>
        <input
          type="range"
          min={parameter.min ?? 0}
          max={parameter.max ?? 100}
          value={parameter.value}
          onChange={handleChange}
        />
        <input
          type="number"
          min={parameter.min}
          max={parameter.max}
          value={parameter.value}
          onChange={handleChange}
        />
      </div>
    );
  }

  if (parameter.type === 'boolean') {
    return (
      <div className="parameter-controls parameter-controls--boolean">
        <label>
          <input
            type="checkbox"
            checked={parameter.value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          />
          {parameter.name}
        </label>
      </div>
    );
  }

  if (parameter.type === 'date') {
    return (
      <div className="parameter-controls parameter-controls--date">
        <label>{parameter.name}</label>
        <input
          type="date"
          value={parameter.value}
          onChange={handleChange}
        />
      </div>
    );
  }

  // Default: string, column
  return (
    <div className="parameter-controls parameter-controls--string">
      <label>{parameter.name}</label>
      {parameter.options ? (
        <select
          value={parameter.value}
          onChange={(e) => onChange(e.target.value)}
        >
          {parameter.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={parameter.value}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
