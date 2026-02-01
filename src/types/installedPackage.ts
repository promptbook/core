/**
 * Types for installed Python package management
 */

/** Information about an installed Python package */
export interface InstalledPackage {
  /** Package name */
  name: string;
  /** Installed version */
  version: string;
}

/** Result of listing installed packages */
export interface ListPackagesResult {
  success: boolean;
  packages?: InstalledPackage[];
  error?: string;
}

/** Result of install/uninstall operation */
export interface PackageOperationResult {
  success: boolean;
  error?: string;
  /** Output from pip command */
  output?: string;
}
