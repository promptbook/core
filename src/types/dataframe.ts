/**
 * DataFrame viewer type definitions shared between packages
 */

/**
 * Custom MIME type for DataFrame detection
 */
export const DATAFRAME_MIME_TYPE = 'application/vnd.promptbook.dataframe+json';

/**
 * Column data type enumeration
 */
export type DataFrameColumnType =
  | 'int64'
  | 'float64'
  | 'object'
  | 'bool'
  | 'datetime64'
  | 'category'
  | 'string';

/**
 * Column metadata
 */
export interface DataFrameColumn {
  name: string;
  dtype: DataFrameColumnType;
  nullable: boolean;
}

/**
 * Filter operation types
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'is_null'
  | 'is_not_null';

/**
 * Filter configuration for a column
 */
export interface DataFrameFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | [number, number];
}

/**
 * Sort configuration
 */
export interface DataFrameSort {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface DataFramePagination {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

/**
 * Metadata sent with DataFrame display
 */
export interface DataFrameMetadata {
  /** Unique identifier for this DataFrame in kernel registry */
  dfId: string;
  /** Variable name in kernel namespace */
  variableName: string;
  /** Column definitions */
  columns: DataFrameColumn[];
  /** Total number of rows */
  totalRows: number;
  /** Current page data */
  pageData: Record<string, unknown>[];
  /** Pagination state */
  pagination: DataFramePagination;
}

/**
 * Request for fetching a page of DataFrame data
 */
export interface DataFramePageRequest {
  dfId: string;
  page: number;
  pageSize: number;
}

/**
 * Response from page fetch
 */
export interface DataFramePageResponse {
  success: boolean;
  data?: Record<string, unknown>[];
  pagination?: DataFramePagination;
  error?: string;
}

/**
 * Cell edit request
 */
export interface DataFrameCellEditRequest {
  dfId: string;
  rowIndex: number;
  column: string;
  value: unknown;
}

/**
 * Row operation request
 */
export interface DataFrameRowRequest {
  dfId: string;
  operation: 'add' | 'delete';
  rowIndex?: number;
  rowData?: Record<string, unknown>;
}

/**
 * Column operation request
 */
export interface DataFrameColumnRequest {
  dfId: string;
  operation: 'add' | 'delete' | 'rename' | 'change_type';
  column: string;
  newName?: string;
  newType?: DataFrameColumnType;
  defaultValue?: unknown;
}

/**
 * Generic operation response
 */
export interface DataFrameOperationResponse {
  success: boolean;
  error?: string;
  /** Updated metadata after operation */
  metadata?: DataFrameMetadata;
}
