import React, { useState, useEffect, useCallback } from 'react';

export interface Variable {
  name: string;
  type: string;
  value: string;
  size?: string;
}

interface VariableInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<Variable[]>;
}

// Icons
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1.5 7a5.5 5.5 0 1 0 1.1-3.3M1.5 2v2h2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
  >
    <path d="M4.5 3l3 3-3 3" />
  </svg>
);

function getTypeColor(type: string): string {
  if (type.startsWith('int') || type.startsWith('float')) return 'var(--pb-info)';
  if (type === 'str') return 'var(--pb-success)';
  if (type === 'bool') return 'var(--pb-warning)';
  if (type.startsWith('list') || type.startsWith('tuple')) return '#8b5cf6';
  if (type.startsWith('dict')) return 'var(--pb-accent)';
  if (type === 'DataFrame') return '#ec4899';
  if (type.startsWith('ndarray')) return '#06b6d4';
  return 'var(--pb-text-tertiary)';
}

function VariableRow({ variable }: { variable: Variable }) {
  const [expanded, setExpanded] = useState(false);
  const isExpandable = variable.value.length > 50 || variable.value.includes('\n');

  return (
    <div className="variable-row">
      <div className="variable-row__header" onClick={() => isExpandable && setExpanded(!expanded)}>
        {isExpandable && (
          <span className="variable-row__chevron">
            <ChevronIcon expanded={expanded} />
          </span>
        )}
        <span className="variable-row__name">{variable.name}</span>
        <span className="variable-row__type" style={{ color: getTypeColor(variable.type) }}>
          {variable.type}
        </span>
        {variable.size && <span className="variable-row__size">{variable.size}</span>}
      </div>
      <div className={`variable-row__value ${expanded ? 'variable-row__value--expanded' : ''}`}>
        {expanded ? variable.value : variable.value.slice(0, 50) + (variable.value.length > 50 ? '...' : '')}
      </div>
    </div>
  );
}

export function VariableInspector({ isOpen, onClose, onRefresh }: VariableInspectorProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const vars = await onRefresh();
      setVariables(vars);
    } catch (error) {
      console.error('Failed to fetch variables:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  // Refresh on open
  useEffect(() => {
    if (isOpen) {
      handleRefresh();
    }
  }, [isOpen, handleRefresh]);

  const filteredVariables = variables.filter(
    (v) =>
      v.name.toLowerCase().includes(filter.toLowerCase()) ||
      v.type.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="variable-inspector">
      <div className="variable-inspector__header">
        <h3>Variables</h3>
        <div className="variable-inspector__actions">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="variable-inspector__refresh"
            title="Refresh variables"
          >
            {isLoading ? (
              <span className="variable-inspector__spinner" />
            ) : (
              <RefreshIcon />
            )}
          </button>
          <button onClick={onClose} className="variable-inspector__close" title="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="variable-inspector__search">
        <input
          type="text"
          placeholder="Filter variables..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="variable-inspector__content">
        {variables.length === 0 ? (
          <div className="variable-inspector__empty">
            {isLoading ? 'Loading...' : 'No variables defined'}
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className="variable-inspector__empty">No matching variables</div>
        ) : (
          <div className="variable-inspector__list">
            {filteredVariables.map((variable) => (
              <VariableRow key={variable.name} variable={variable} />
            ))}
          </div>
        )}
      </div>

      <div className="variable-inspector__footer">
        {variables.length} variable{variables.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
