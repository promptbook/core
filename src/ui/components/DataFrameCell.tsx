import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { DataFrameColumn } from '../../types';

interface DataFrameCellProps {
  value: unknown;
  column: DataFrameColumn;
  rowIndex: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

/**
 * Parse a string value into the appropriate type based on column dtype
 */
function parseValue(value: string, dtype: string): unknown {
  const trimmed = value.trim();

  // Handle empty/null values
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'none') {
    return null;
  }

  switch (dtype) {
    case 'int64':
      const intVal = parseInt(trimmed, 10);
      if (isNaN(intVal)) {
        throw new Error(`Invalid integer: ${trimmed}`);
      }
      return intVal;

    case 'float64':
      const floatVal = parseFloat(trimmed);
      if (isNaN(floatVal)) {
        throw new Error(`Invalid number: ${trimmed}`);
      }
      return floatVal;

    case 'bool':
      const lower = trimmed.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
      throw new Error(`Invalid boolean: ${trimmed}`);

    case 'datetime64':
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${trimmed}`);
      }
      return date.toISOString();

    case 'object':
    case 'string':
    case 'category':
    default:
      return trimmed;
  }
}

/**
 * Format a value for display based on column dtype
 */
function formatValue(value: unknown, dtype: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (dtype) {
    case 'int64':
      return typeof value === 'number' ? value.toLocaleString() : String(value);

    case 'float64':
      if (typeof value === 'number') {
        // Show up to 6 decimal places, removing trailing zeros
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        });
      }
      return String(value);

    case 'bool':
      return value ? 'true' : 'false';

    case 'datetime64':
      if (typeof value === 'string' || value instanceof Date) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().replace('T', ' ').slice(0, 19);
        }
      }
      return String(value);

    case 'object':
    case 'string':
    case 'category':
    default:
      return String(value);
  }
}

/**
 * Get the appropriate input type based on column dtype
 */
function getInputType(dtype: string): string {
  switch (dtype) {
    case 'int64':
    case 'float64':
      return 'text'; // Use text to allow scientific notation, commas, etc.
    case 'datetime64':
      return 'datetime-local';
    default:
      return 'text';
  }
}

export function DataFrameCell({
  value,
  column,
  rowIndex,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: DataFrameCellProps) {
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // For editing, use raw value (no formatting with commas)
      if (value === null || value === undefined) {
        setEditValue('');
      } else if (column.dtype === 'datetime64') {
        // Format for datetime-local input
        const date = new Date(value as string);
        if (!isNaN(date.getTime())) {
          setEditValue(date.toISOString().slice(0, 16));
        } else {
          setEditValue(String(value));
        }
      } else {
        setEditValue(String(value));
      }
      setError(null);
    }
  }, [isEditing, value, column.dtype]);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    try {
      const parsedValue = parseValue(editValue, column.dtype);
      onSave(parsedValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid value');
    }
  }, [editValue, column.dtype, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      // Allow tab to naturally move focus, but save first
      handleSave();
    }
  }, [handleSave, onCancel]);

  const handleBlur = useCallback(() => {
    // Small delay to allow click events on other cells to fire first
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        onCancel();
      }
    }, 100);
  }, [onCancel]);

  const isNull = value === null || value === undefined;
  const displayValue = formatValue(value, column.dtype);

  // Determine CSS class based on dtype
  const dtypeClass = `dataframe-cell--${column.dtype.replace(/[^a-z0-9]/g, '')}`;

  if (isEditing) {
    return (
      <td
        className={`dataframe-cell dataframe-cell--editing ${dtypeClass} ${error ? 'dataframe-cell--error' : ''}`}
        data-row={rowIndex}
        data-column={column.name}
      >
        <input
          ref={inputRef}
          type={getInputType(column.dtype)}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="dataframe-cell__input"
          aria-label={`Edit ${column.name} at row ${rowIndex}`}
          aria-invalid={!!error}
        />
        {error && (
          <span className="dataframe-cell__error" role="alert">
            {error}
          </span>
        )}
      </td>
    );
  }

  return (
    <td
      className={`dataframe-cell ${dtypeClass} ${isNull ? 'dataframe-cell--null' : ''}`}
      onDoubleClick={onStartEdit}
      data-row={rowIndex}
      data-column={column.name}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          onStartEdit();
        }
      }}
      role="gridcell"
      aria-label={`${column.name}: ${isNull ? 'null' : displayValue}`}
    >
      {displayValue}
    </td>
  );
}
