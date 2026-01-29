import React, { useState } from 'react';
import { PythonEnvironment } from '../../kernel/types';

interface EnvironmentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  environments: PythonEnvironment[];
  selectedEnvironment: PythonEnvironment | null;
  onSelect: (env: PythonEnvironment) => void;
  onRefresh: () => void;
  onCreateVenv?: (name: string) => Promise<{ success: boolean; error?: string }>;
  isInstalling?: boolean;
  isCreatingVenv?: boolean;
  installError?: string | null;
}

const typeIcons: Record<PythonEnvironment['type'], string> = {
  venv: '📦',
  conda: '🐍',
  system: '💻',
  pyenv: '🔧',
  pipenv: '📋',
};

export function EnvironmentPicker({
  isOpen,
  onClose,
  environments,
  selectedEnvironment,
  onSelect,
  onRefresh,
  onCreateVenv,
  isInstalling = false,
  isCreatingVenv = false,
  installError = null,
}: EnvironmentPickerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [venvName, setVenvName] = useState('.venv');
  const [createError, setCreateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateVenv = async () => {
    if (!onCreateVenv) return;
    setCreateError(null);
    const result = await onCreateVenv(venvName);
    if (result.success) {
      setShowCreateForm(false);
      setVenvName('.venv');
    } else {
      setCreateError(result.error || 'Failed to create virtual environment');
    }
  };

  const isLoading = isInstalling || isCreatingVenv;

  return (
    <div className="environment-picker__overlay" onClick={onClose}>
      <div className="environment-picker" onClick={(e) => e.stopPropagation()}>
        <header className="environment-picker__header">
          <h2>Select Python Environment</h2>
          <button
            className="environment-picker__close"
            onClick={onClose}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="environment-picker__content">
          {isInstalling && (
            <div className="environment-picker__installing">
              <div className="environment-picker__spinner" />
              <span>Installing ipykernel...</span>
            </div>
          )}

          {isCreatingVenv && (
            <div className="environment-picker__installing">
              <div className="environment-picker__spinner" />
              <span>Creating virtual environment...</span>
            </div>
          )}

          {installError && !isLoading && (
            <div className="environment-picker__create-error" style={{ margin: 'var(--pb-space-4)' }}>
              {installError}
            </div>
          )}

          {!isLoading && showCreateForm && (
            <div className="environment-picker__create-form">
              <div className="environment-picker__create-header">
                <span className="environment-picker__create-icon">📦</span>
                <span>Create New Virtual Environment</span>
              </div>
              <div className="environment-picker__create-field">
                <label htmlFor="venv-name">Folder name</label>
                <input
                  id="venv-name"
                  type="text"
                  value={venvName}
                  onChange={(e) => setVenvName(e.target.value)}
                  placeholder=".venv"
                />
                <span className="environment-picker__create-hint">
                  Will be created in the current working directory
                </span>
              </div>
              {createError && (
                <div className="environment-picker__create-error">
                  {createError}
                </div>
              )}
              <div className="environment-picker__create-actions">
                <button
                  className="environment-picker__create-cancel"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="environment-picker__create-submit"
                  onClick={handleCreateVenv}
                  disabled={!venvName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {!isLoading && !showCreateForm && environments.length === 0 && (
            <div className="environment-picker__empty">
              <p>No Python environments found.</p>
              <p>Create a new virtual environment or make sure Python is installed.</p>
              {onCreateVenv && (
                <button
                  className="environment-picker__create-btn"
                  onClick={() => setShowCreateForm(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  <span>Create venv</span>
                </button>
              )}
            </div>
          )}

          {!isLoading && !showCreateForm && environments.length > 0 && (
            <ul className="environment-picker__list">
              {environments.map((env) => (
                <li key={env.path}>
                  <button
                    className={`environment-picker__item ${
                      selectedEnvironment?.path === env.path ? 'environment-picker__item--selected' : ''
                    }`}
                    onClick={() => onSelect(env)}
                    disabled={isLoading}
                  >
                    <span className="environment-picker__icon">{typeIcons[env.type]}</span>
                    <div className="environment-picker__info">
                      <span className="environment-picker__name">{env.name}</span>
                      <span className="environment-picker__details">
                        Python {env.version} • {env.path}
                      </span>
                    </div>
                    {!env.hasIpykernel && (
                      <span className="environment-picker__badge" title="ipykernel will be installed">
                        needs ipykernel
                      </span>
                    )}
                    {env.hasIpykernel && (
                      <span className="environment-picker__check">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 8l4 4 6-8" />
                        </svg>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="environment-picker__footer">
          {onCreateVenv && !showCreateForm && environments.length > 0 && (
            <button
              className="environment-picker__create-btn-small"
              onClick={() => setShowCreateForm(true)}
              disabled={isLoading}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 2v10M2 7h10" />
              </svg>
              <span>Create venv</span>
            </button>
          )}
          <button
            className="environment-picker__refresh"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 7a6 6 0 1 1 1.5 4" />
              <path d="M1 11V7h4" />
            </svg>
            <span>Refresh</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
