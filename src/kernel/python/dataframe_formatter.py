"""
DataFrame formatter for Promptbook.

Provides custom MIME type output for pandas DataFrames with pagination support.
Registers DataFrames in a global registry for subsequent operations.
"""

import json
import math
from typing import Any, Dict, Optional
from uuid import uuid4

# Global registry to store DataFrame references by ID
__promptbook_dataframes__: Dict[str, Dict[str, Any]] = {}

# Custom MIME type for DataFrame detection
MIME_TYPE = 'application/vnd.promptbook.dataframe+json'

# Default pagination size
DEFAULT_PAGE_SIZE = 25


def get_column_dtype(dtype) -> str:
    """
    Convert pandas dtype to our standardized type string.

    Args:
        dtype: A pandas dtype object

    Returns:
        One of: 'int64', 'float64', 'bool', 'datetime64', 'category', 'string', 'object'
    """
    dtype_str = str(dtype)

    # Integer types
    if 'int' in dtype_str.lower():
        return 'int64'

    # Float types
    if 'float' in dtype_str.lower():
        return 'float64'

    # Boolean type
    if dtype_str == 'bool' or dtype_str == 'boolean':
        return 'bool'

    # Datetime types
    if 'datetime' in dtype_str.lower() or 'timestamp' in dtype_str.lower():
        return 'datetime64'

    # Category type
    if dtype_str == 'category':
        return 'category'

    # String types (pandas 1.0+ StringDtype)
    if dtype_str == 'string' or dtype_str == 'string[python]' or dtype_str == 'string[pyarrow]':
        return 'string'

    # Default to object for everything else
    return 'object'


def register_dataframe(df, var_name: str = '') -> str:
    """
    Register a DataFrame in the global registry.

    Args:
        df: A pandas DataFrame
        var_name: Optional variable name for display

    Returns:
        A unique identifier (first 8 chars of uuid4)
    """
    df_id = str(uuid4())[:8]
    __promptbook_dataframes__[df_id] = {
        'dataframe': df,
        'var_name': var_name
    }
    return df_id


def get_dataframe(df_id: str) -> Optional[Any]:
    """
    Retrieve a DataFrame from the registry by ID.

    Args:
        df_id: The DataFrame identifier

    Returns:
        The pandas DataFrame or None if not found
    """
    entry = __promptbook_dataframes__.get(df_id)
    if entry:
        return entry['dataframe']
    return None


def get_dataframe_var_name(df_id: str) -> str:
    """
    Get the variable name for a registered DataFrame.

    Args:
        df_id: The DataFrame identifier

    Returns:
        The variable name or empty string if not found
    """
    entry = __promptbook_dataframes__.get(df_id)
    if entry:
        return entry.get('var_name', '')
    return ''


def format_dataframe(
    df,
    var_name: str = '',
    page: int = 0,
    page_size: int = DEFAULT_PAGE_SIZE
) -> Dict[str, Any]:
    """
    Format a DataFrame with pagination metadata.

    Args:
        df: A pandas DataFrame
        var_name: Optional variable name
        page: Page number (0-indexed)
        page_size: Number of rows per page

    Returns:
        Dict with dfId, variableName, columns, totalRows, pageData, pagination
    """
    import pandas as pd

    # Register the DataFrame
    df_id = register_dataframe(df, var_name)

    # Get total rows
    total_rows = len(df)
    total_pages = max(1, math.ceil(total_rows / page_size))

    # Ensure page is valid
    page = max(0, min(page, total_pages - 1))

    # Calculate slice indices
    start_idx = page * page_size
    end_idx = min(start_idx + page_size, total_rows)

    # Get page data
    page_df = df.iloc[start_idx:end_idx]

    # Convert to list of dicts, handling special types
    page_data = []
    for _, row in page_df.iterrows():
        row_dict = {}
        for col in df.columns:
            val = row[col]
            # Handle NaN/None
            if pd.isna(val):
                row_dict[col] = None
            # Handle datetime
            elif hasattr(val, 'isoformat'):
                row_dict[col] = val.isoformat()
            # Handle numpy types
            elif hasattr(val, 'item'):
                row_dict[col] = val.item()
            else:
                row_dict[col] = val
        page_data.append(row_dict)

    # Build column metadata
    columns = []
    for col in df.columns:
        columns.append({
            'name': str(col),
            'dtype': get_column_dtype(df[col].dtype),
            'nullable': bool(df[col].isna().any())
        })

    return {
        'dfId': df_id,
        'variableName': var_name,
        'columns': columns,
        'totalRows': total_rows,
        'pageData': page_data,
        'pagination': {
            'page': page,
            'pageSize': page_size,
            'totalRows': total_rows,
            'totalPages': total_pages
        }
    }


class DataFrameFormatter:
    """
    IPython formatter for pandas DataFrames.

    Outputs DataFrames with our custom MIME type for interactive viewing.
    """

    format_type = MIME_TYPE
    print_method = '_repr_promptbook_df_'

    def __call__(self, obj) -> Optional[str]:
        """
        Format the object if it's a DataFrame.

        Args:
            obj: The object to format

        Returns:
            JSON string with DataFrame metadata or None
        """
        try:
            import pandas as pd

            if isinstance(obj, pd.DataFrame):
                var_name = self._find_var_name(obj)
                result = format_dataframe(obj, var_name)
                return json.dumps(result)
        except ImportError:
            pass

        return None

    def _find_var_name(self, df) -> str:
        """
        Find the variable name for a DataFrame in IPython's user namespace.

        Args:
            df: The DataFrame to find

        Returns:
            The variable name or empty string
        """
        try:
            from IPython import get_ipython

            ip = get_ipython()
            if ip is None:
                return ''

            # Search user namespace for this DataFrame
            for name, value in ip.user_ns.items():
                # Skip private/magic names
                if name.startswith('_'):
                    continue
                # Check if it's the same object
                if value is df:
                    return name
        except Exception:
            pass

        return ''


def install_formatter() -> None:
    """
    Install the DataFrame formatter in IPython.
    """
    try:
        from IPython import get_ipython
        from IPython.display import display
        import builtins

        ip = get_ipython()
        if ip is None:
            return

        # Get the display formatter
        formatter = ip.display_formatter

        # Register our MIME type formatter
        if hasattr(formatter, 'formatters'):
            formatter.formatters[MIME_TYPE] = DataFrameFormatter()

        # Also register for pandas DataFrames specifically
        try:
            import pandas as pd

            # Add a method to DataFrame class for our format
            def _repr_promptbook_df_(self):
                var_name = ''
                try:
                    # Try to find variable name
                    ip = get_ipython()
                    if ip:
                        for name, value in ip.user_ns.items():
                            if not name.startswith('_') and value is self:
                                var_name = name
                                break
                except Exception:
                    pass

                result = format_dataframe(self, var_name)
                return json.dumps(result)

            pd.DataFrame._repr_promptbook_df_ = _repr_promptbook_df_

            # Patch print() to use display() for DataFrames
            # This ensures print(df) shows our interactive viewer
            _original_print = builtins.print

            def _promptbook_print(*args, **kwargs):
                """
                Patched print that uses display() for DataFrames.
                """
                # Check if any argument is a DataFrame
                has_dataframe = False
                for arg in args:
                    if isinstance(arg, pd.DataFrame):
                        has_dataframe = True
                        break

                if has_dataframe:
                    # If printing DataFrames, use display() for each
                    for arg in args:
                        if isinstance(arg, pd.DataFrame):
                            display(arg)
                        else:
                            _original_print(arg, **kwargs)
                else:
                    # Normal print for everything else
                    _original_print(*args, **kwargs)

            # Install the patched print in builtins and user namespace
            builtins.print = _promptbook_print
            if ip and hasattr(ip, 'user_ns'):
                ip.user_ns['print'] = _promptbook_print

            # Store original for uninstall
            builtins._promptbook_original_print = _original_print

        except ImportError:
            pass

    except ImportError:
        pass


def uninstall_formatter() -> None:
    """
    Remove the DataFrame formatter from IPython.
    """
    try:
        from IPython import get_ipython
        import builtins

        ip = get_ipython()
        if ip is None:
            return

        # Remove our MIME type formatter
        formatter = ip.display_formatter
        if hasattr(formatter, 'formatters') and MIME_TYPE in formatter.formatters:
            del formatter.formatters[MIME_TYPE]

        # Restore original print function
        if hasattr(builtins, '_promptbook_original_print'):
            builtins.print = builtins._promptbook_original_print
            delattr(builtins, '_promptbook_original_print')
            if ip and hasattr(ip, 'user_ns') and 'print' in ip.user_ns:
                ip.user_ns['print'] = builtins.print

        # Remove the method from DataFrame class
        try:
            import pandas as pd

            if hasattr(pd.DataFrame, '_repr_promptbook_df_'):
                delattr(pd.DataFrame, '_repr_promptbook_df_')
        except (ImportError, AttributeError):
            pass

    except ImportError:
        pass


# Auto-install when module is imported
install_formatter()
