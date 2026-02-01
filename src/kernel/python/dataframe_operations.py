"""
DataFrame Operations for Promptbook.

Provides functions for manipulating DataFrames: pagination, cell editing,
row/column operations, and type conversions.
"""

import json
import math
import time
from typing import Any, Dict, List, Optional, Union

import pandas as pd
from IPython import get_ipython

from .dataframe_formatter import (
    __promptbook_dataframes__,
    get_dataframe,
    get_dataframe_var_name,
    format_dataframe,
    DEFAULT_PAGE_SIZE,
    get_column_dtype
)


def _get_entry(df_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the registry entry for a DataFrame.

    Args:
        df_id: The DataFrame identifier

    Returns:
        The registry entry or None if not found
    """
    return __promptbook_dataframes__.get(df_id)


def _update_user_namespace(df_id: str, df: pd.DataFrame) -> None:
    """
    Update the original variable in the user namespace.

    Args:
        df_id: The DataFrame identifier
        df: The updated DataFrame
    """
    var_name = get_dataframe_var_name(df_id)
    if not var_name:
        return

    try:
        ip = get_ipython()
        if ip is not None:
            ip.user_ns[var_name] = df
    except Exception:
        pass


def _build_metadata(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Build metadata for a DataFrame response.

    Args:
        df: The DataFrame

    Returns:
        Dict with columns and totalRows
    """
    columns = []
    for col in df.columns:
        columns.append({
            'name': str(col),
            'dtype': get_column_dtype(df[col].dtype),
            'nullable': bool(df[col].isna().any())
        })

    return {
        'columns': columns,
        'totalRows': len(df)
    }


def _convert_value(value: Any, dtype: str) -> Any:
    """
    Convert a value to the appropriate type for a column.

    Args:
        value: The value to convert
        dtype: The target dtype string

    Returns:
        The converted value
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if dtype == 'int64':
        return int(float(value))
    elif dtype == 'float64':
        return float(value)
    elif dtype == 'bool':
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes')
        return bool(value)
    elif dtype == 'datetime64':
        return pd.to_datetime(value)
    elif dtype == 'string' or dtype == 'object':
        return str(value)
    elif dtype == 'category':
        return str(value)
    else:
        return value


def get_page(
    df_id: str,
    page: int = 0,
    page_size: int = DEFAULT_PAGE_SIZE
) -> Dict[str, Any]:
    """
    Get a page of DataFrame data.

    Args:
        df_id: The DataFrame identifier
        page: Page number (0-indexed)
        page_size: Number of rows per page

    Returns:
        Dict with success, data, and pagination info
    """
    df = get_dataframe(df_id)
    if df is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    total_rows = len(df)
    total_pages = max(1, math.ceil(total_rows / page_size))

    # Ensure page is valid
    page = max(0, min(page, total_pages - 1))

    # Calculate slice indices
    start_idx = page * page_size
    end_idx = min(start_idx + page_size, total_rows)

    # Get page data
    page_df = df.iloc[start_idx:end_idx]

    # Convert to list of dicts
    page_data = []
    for idx, row in page_df.iterrows():
        row_dict = {'__index__': idx}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                row_dict[col] = None
            elif hasattr(val, 'isoformat'):
                row_dict[col] = val.isoformat()
            elif hasattr(val, 'item'):
                row_dict[col] = val.item()
            else:
                row_dict[col] = val
        page_data.append(row_dict)

    return {
        'success': True,
        'data': page_data,
        'pagination': {
            'page': page,
            'pageSize': page_size,
            'totalRows': total_rows,
            'totalPages': total_pages
        }
    }


def edit_cell(
    df_id: str,
    row_index: int,
    column: str,
    value: Any
) -> Dict[str, Any]:
    """
    Edit a single cell in a DataFrame.

    Args:
        df_id: The DataFrame identifier
        row_index: The row index to edit
        column: The column name
        value: The new value

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Validate row index
    if row_index < 0 or row_index >= len(df):
        return {'success': False, 'error': f'Row index out of range: {row_index}'}

    # Validate column
    if column not in df.columns:
        return {'success': False, 'error': f'Column not found: {column}'}

    try:
        # Get column dtype and convert value
        dtype = get_column_dtype(df[column].dtype)
        converted_value = _convert_value(value, dtype)

        # Update the cell
        df.iloc[row_index, df.columns.get_loc(column)] = converted_value

        # Update registry
        entry['dataframe'] = df

        # Update user namespace
        _update_user_namespace(df_id, df)

        return {
            'success': True,
            'metadata': _build_metadata(df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def add_row(
    df_id: str,
    row_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Add a new row to a DataFrame.

    Args:
        df_id: The DataFrame identifier
        row_data: Optional dict of column values (None = empty row with nulls)

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    try:
        # Create new row
        if row_data is None:
            new_row = {col: None for col in df.columns}
        else:
            new_row = {}
            for col in df.columns:
                if col in row_data:
                    dtype = get_column_dtype(df[col].dtype)
                    new_row[col] = _convert_value(row_data[col], dtype)
                else:
                    new_row[col] = None

        # Append row
        new_df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        # Update registry
        entry['dataframe'] = new_df

        # Update user namespace
        _update_user_namespace(df_id, new_df)

        return {
            'success': True,
            'metadata': _build_metadata(new_df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def delete_row(df_id: str, row_index: int) -> Dict[str, Any]:
    """
    Delete a row from a DataFrame.

    Args:
        df_id: The DataFrame identifier
        row_index: The row index to delete

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Validate row index
    if row_index < 0 or row_index >= len(df):
        return {'success': False, 'error': f'Row index out of range: {row_index}'}

    try:
        # Delete row and reset index
        new_df = df.drop(df.index[row_index]).reset_index(drop=True)

        # Update registry
        entry['dataframe'] = new_df

        # Update user namespace
        _update_user_namespace(df_id, new_df)

        return {
            'success': True,
            'metadata': _build_metadata(new_df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def add_column(
    df_id: str,
    column: str,
    dtype: str = 'object',
    default_value: Any = None
) -> Dict[str, Any]:
    """
    Add a new column to a DataFrame.

    Args:
        df_id: The DataFrame identifier
        column: The column name
        dtype: The column dtype (int64, float64, string, bool, datetime64, category)
        default_value: Default value for all rows

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Check if column already exists
    if column in df.columns:
        return {'success': False, 'error': f'Column already exists: {column}'}

    try:
        # Create column with default value
        if default_value is not None:
            converted_value = _convert_value(default_value, dtype)
            df[column] = converted_value
        else:
            df[column] = None

        # Convert column to appropriate dtype
        if dtype == 'int64' and default_value is not None:
            df[column] = pd.to_numeric(df[column], errors='coerce').astype('Int64')
        elif dtype == 'float64':
            df[column] = pd.to_numeric(df[column], errors='coerce')
        elif dtype == 'bool':
            df[column] = df[column].astype('boolean')
        elif dtype == 'datetime64':
            df[column] = pd.to_datetime(df[column], errors='coerce')
        elif dtype == 'category':
            df[column] = df[column].astype('category')
        elif dtype == 'string':
            df[column] = df[column].astype('string')

        # Update registry
        entry['dataframe'] = df

        # Update user namespace
        _update_user_namespace(df_id, df)

        return {
            'success': True,
            'metadata': _build_metadata(df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def delete_column(df_id: str, column: str) -> Dict[str, Any]:
    """
    Delete a column from a DataFrame.

    Args:
        df_id: The DataFrame identifier
        column: The column name to delete

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Validate column
    if column not in df.columns:
        return {'success': False, 'error': f'Column not found: {column}'}

    try:
        # Delete column
        new_df = df.drop(columns=[column])

        # Update registry
        entry['dataframe'] = new_df

        # Update user namespace
        _update_user_namespace(df_id, new_df)

        return {
            'success': True,
            'metadata': _build_metadata(new_df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def rename_column(df_id: str, column: str, new_name: str) -> Dict[str, Any]:
    """
    Rename a column in a DataFrame.

    Args:
        df_id: The DataFrame identifier
        column: The current column name
        new_name: The new column name

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Validate column
    if column not in df.columns:
        return {'success': False, 'error': f'Column not found: {column}'}

    # Check if new name already exists
    if new_name in df.columns and new_name != column:
        return {'success': False, 'error': f'Column already exists: {new_name}'}

    try:
        # Rename column
        new_df = df.rename(columns={column: new_name})

        # Update registry
        entry['dataframe'] = new_df

        # Update user namespace
        _update_user_namespace(df_id, new_df)

        return {
            'success': True,
            'metadata': _build_metadata(new_df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def change_column_type(df_id: str, column: str, new_type: str) -> Dict[str, Any]:
    """
    Convert a column to a new data type.

    Args:
        df_id: The DataFrame identifier
        column: The column name
        new_type: The new dtype (int64, float64, string, bool, datetime64, category)

    Returns:
        Dict with success status and metadata
    """
    entry = _get_entry(df_id)
    if entry is None:
        return {'success': False, 'error': f'DataFrame not found: {df_id}'}

    df = entry['dataframe']

    # Validate column
    if column not in df.columns:
        return {'success': False, 'error': f'Column not found: {column}'}

    # Validate type
    valid_types = ['int64', 'float64', 'string', 'bool', 'datetime64', 'category', 'object']
    if new_type not in valid_types:
        return {
            'success': False,
            'error': f'Invalid type: {new_type}. Valid types: {", ".join(valid_types)}'
        }

    try:
        # Convert column based on type
        if new_type == 'int64':
            df[column] = pd.to_numeric(df[column], errors='coerce').astype('Int64')
        elif new_type == 'float64':
            df[column] = pd.to_numeric(df[column], errors='coerce')
        elif new_type == 'string':
            df[column] = df[column].astype('string')
        elif new_type == 'bool':
            # Handle various boolean representations
            col_data = df[column]
            if col_data.dtype == 'object' or col_data.dtype == 'string':
                df[column] = col_data.apply(
                    lambda x: None if pd.isna(x) else str(x).lower() in ('true', '1', 'yes')
                ).astype('boolean')
            else:
                df[column] = col_data.astype('boolean')
        elif new_type == 'datetime64':
            df[column] = pd.to_datetime(df[column], errors='coerce')
        elif new_type == 'category':
            df[column] = df[column].astype('category')
        elif new_type == 'object':
            df[column] = df[column].astype('object')

        # Update registry
        entry['dataframe'] = df

        # Update user namespace
        _update_user_namespace(df_id, df)

        return {
            'success': True,
            'metadata': _build_metadata(df)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def cleanup_registry(max_age_minutes: int = 60) -> Dict[str, Any]:
    """
    Remove old DataFrames from the registry.

    Note: This requires tracking registration time, which is not currently
    implemented in the base formatter. For now, this clears all entries.

    Args:
        max_age_minutes: Maximum age in minutes (not currently used)

    Returns:
        Dict with removed and remaining counts
    """
    removed = len(__promptbook_dataframes__)
    __promptbook_dataframes__.clear()

    return {
        'removed': removed,
        'remaining': 0
    }
