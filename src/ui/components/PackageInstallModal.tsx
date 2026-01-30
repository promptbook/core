// packages/core/src/ui/components/PackageInstallModal.tsx
// Modal dialog for installing missing Python packages

import React, { useState, useEffect } from 'react';
import { MissingPackage, isValidPackageName } from '../../utils/packageDetection';

export type InstallAction = 'once' | 'current-cell' | 'setup-cell';

interface PackageInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: MissingPackage[];
  onInstall: (packages: string[], action: InstallAction) => Promise<void>;
  isInstalling?: boolean;
  installError?: string | null;
}

export function PackageInstallModal({
  isOpen,
  onClose,
  packages,
  onInstall,
  isInstalling = false,
  installError = null,
}: PackageInstallModalProps) {
  // Track edited package names (user can modify them)
  const [editedPackages, setEditedPackages] = useState<Record<string, string>>({});

  // Reset edited packages when modal opens with new packages
  useEffect(() => {
    if (isOpen && packages.length > 0) {
      const initial: Record<string, string> = {};
      packages.forEach(pkg => {
        initial[pkg.importName] = pkg.packageName;
      });
      setEditedPackages(initial);
    }
  }, [isOpen, packages]);

  if (!isOpen) return null;

  const handlePackageEdit = (importName: string, newValue: string) => {
    setEditedPackages(prev => ({ ...prev, [importName]: newValue }));
  };

  const handleInstall = async (action: InstallAction) => {
    const packagesToInstall = Object.values(editedPackages).filter(
      p => p.trim() && isValidPackageName(p.trim())
    );
    if (packagesToInstall.length === 0) return;
    await onInstall(packagesToInstall, action);
  };

  const hasValidPackages = Object.values(editedPackages).some(
    p => p.trim() && isValidPackageName(p.trim())
  );

  return (
    <div className="package-install-overlay" onClick={onClose}>
      <div className="package-install-modal" onClick={e => e.stopPropagation()}>
        <header className="package-install-header">
          <h2>Missing Python Packages</h2>
          <button
            className="package-install-close"
            onClick={onClose}
            title="Close"
            disabled={isInstalling}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="package-install-content">
          {isInstalling ? (
            <div className="package-install-loading">
              <div className="package-install-spinner" />
              <span>Installing packages...</span>
            </div>
          ) : (
            <>
              <p className="package-install-description">
                The following packages are missing. You can edit the package names if needed:
              </p>

              <div className="package-install-list">
                {packages.map(pkg => {
                  const showHint = pkg.packageName !== pkg.importName;
                  const currentValue = editedPackages[pkg.importName] || pkg.packageName;
                  const isValid = isValidPackageName(currentValue.trim());

                  return (
                    <div key={pkg.importName} className="package-install-item">
                      <div className="package-install-item-row">
                        <input
                          type="text"
                          value={currentValue}
                          onChange={e => handlePackageEdit(pkg.importName, e.target.value)}
                          className={`package-install-input ${!isValid && currentValue ? 'package-install-input--invalid' : ''}`}
                          placeholder="Package name"
                        />
                        {showHint && (
                          <span className="package-install-hint">
                            (import: {pkg.importName})
                          </span>
                        )}
                      </div>
                      {!isValid && currentValue && (
                        <span className="package-install-error-hint">Invalid package name</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {installError && (
                <div className="package-install-error">
                  {installError}
                </div>
              )}
            </>
          )}
        </div>

        {!isInstalling && (
          <footer className="package-install-footer">
            <div className="package-install-actions">
              <button
                onClick={() => handleInstall('once')}
                className="package-install-btn package-install-btn--secondary"
                disabled={!hasValidPackages}
                title="Install packages in the current kernel session (won't persist after restart)"
              >
                Install Once
              </button>
              <button
                onClick={() => handleInstall('current-cell')}
                className="package-install-btn package-install-btn--secondary"
                disabled={!hasValidPackages}
                title="Add !pip install to the beginning of this cell"
              >
                Add to This Cell
              </button>
              <button
                onClick={() => handleInstall('setup-cell')}
                className="package-install-btn package-install-btn--primary"
                disabled={!hasValidPackages}
                title="Add to a setup cell at the top of the notebook (recommended)"
              >
                Add to Setup Cell
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
