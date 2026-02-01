import React, { useState, useEffect, useCallback } from 'react';
import type { InstalledPackage } from '../../types';
import '../styles/package-inspector.css';

interface PackageInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<InstalledPackage[]>;
  onInstall: (packageName: string) => Promise<{ success: boolean; error?: string }>;
  onUninstall: (packageName: string) => Promise<{ success: boolean; error?: string }>;
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

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
    <path d="M6 6.5v4M8 6.5v4" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 3v8M3 7h8" />
  </svg>
);

interface PackageRowProps {
  pkg: InstalledPackage;
  onUninstall: (name: string) => void;
  isUninstalling: boolean;
}

function PackageRow({ pkg, onUninstall, isUninstalling }: PackageRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleUninstallClick = () => {
    if (confirmDelete) {
      onUninstall(pkg.name);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  // Reset confirm state when clicking elsewhere
  useEffect(() => {
    if (confirmDelete) {
      const timer = setTimeout(() => setConfirmDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDelete]);

  return (
    <div className="package-row">
      <div className="package-row__info">
        <span className="package-row__name">{pkg.name}</span>
        <span className="package-row__version">{pkg.version}</span>
      </div>
      <button
        className={`package-row__uninstall ${confirmDelete ? 'package-row__uninstall--confirm' : ''}`}
        onClick={handleUninstallClick}
        disabled={isUninstalling}
        title={confirmDelete ? 'Click again to confirm' : `Uninstall ${pkg.name}`}
      >
        {isUninstalling ? (
          <span className="package-inspector__spinner" />
        ) : confirmDelete ? (
          'Confirm?'
        ) : (
          <TrashIcon />
        )}
      </button>
    </div>
  );
}

export function PackageInspector({
  isOpen,
  onClose,
  onRefresh,
  onInstall,
  onUninstall,
}: PackageInspectorProps) {
  const [packages, setPackages] = useState<InstalledPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [installInput, setInstallInput] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [uninstallingPackage, setUninstallingPackage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pkgs = await onRefresh();
      setPackages(pkgs);
    } catch (err) {
      setError('Failed to load packages');
      console.error('Failed to fetch packages:', err);
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

  const handleInstall = useCallback(async () => {
    const packageName = installInput.trim();
    if (!packageName) return;

    setIsInstalling(true);
    setError(null);
    try {
      const result = await onInstall(packageName);
      if (result.success) {
        setInstallInput('');
        await handleRefresh();
      } else {
        setError(result.error || 'Installation failed');
      }
    } catch (err) {
      setError('Installation failed');
      console.error('Failed to install package:', err);
    } finally {
      setIsInstalling(false);
    }
  }, [installInput, onInstall, handleRefresh]);

  const handleUninstall = useCallback(async (packageName: string) => {
    setUninstallingPackage(packageName);
    setError(null);
    try {
      const result = await onUninstall(packageName);
      if (result.success) {
        await handleRefresh();
      } else {
        setError(result.error || 'Uninstall failed');
      }
    } catch (err) {
      setError('Uninstall failed');
      console.error('Failed to uninstall package:', err);
    } finally {
      setUninstallingPackage(null);
    }
  }, [onUninstall, handleRefresh]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isInstalling) {
      handleInstall();
    }
  };

  const filteredPackages = packages.filter(
    (p) => p.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="package-inspector">
      <div className="package-inspector__header">
        <h3>Packages</h3>
        <div className="package-inspector__actions">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="package-inspector__refresh"
            title="Refresh packages"
          >
            {isLoading ? (
              <span className="package-inspector__spinner" />
            ) : (
              <RefreshIcon />
            )}
          </button>
          <button onClick={onClose} className="package-inspector__close" title="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Install input */}
      <div className="package-inspector__install">
        <input
          type="text"
          placeholder="Package name to install..."
          value={installInput}
          onChange={(e) => setInstallInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInstalling}
        />
        <button
          onClick={handleInstall}
          disabled={isInstalling || !installInput.trim()}
          className="package-inspector__install-btn"
          title="Install package"
        >
          {isInstalling ? (
            <span className="package-inspector__spinner" />
          ) : (
            <PlusIcon />
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="package-inspector__error">
          {error}
          <button onClick={() => setError(null)} title="Dismiss">
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Search filter */}
      <div className="package-inspector__search">
        <input
          type="text"
          placeholder="Filter packages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Package list */}
      <div className="package-inspector__content">
        {packages.length === 0 ? (
          <div className="package-inspector__empty">
            {isLoading ? 'Loading...' : 'No packages installed'}
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="package-inspector__empty">No matching packages</div>
        ) : (
          <div className="package-inspector__list">
            {filteredPackages.map((pkg) => (
              <PackageRow
                key={pkg.name}
                pkg={pkg}
                onUninstall={handleUninstall}
                isUninstalling={uninstallingPackage === pkg.name}
              />
            ))}
          </div>
        )}
      </div>

      <div className="package-inspector__footer">
        {packages.length} package{packages.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
