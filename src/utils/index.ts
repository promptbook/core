// Re-export utilities from @promptbook/kernel (utils are now part of kernel package)
export {
  detectMissingPackages,
  mapPackageName,
  isValidPackageName,
  generatePipInstallCommand,
  hasPipInstalls,
  countPipInstalls,
  resolveWithin,
  isWithin,
} from '@promptbook/kernel';

export type {
  MissingPackage,
  PackageDetectionResult,
} from '@promptbook/kernel';
