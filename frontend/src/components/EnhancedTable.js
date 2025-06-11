import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Typography,
  Collapse,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GetApp as ExportIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

function EnhancedTable({
  data = [],
  columns = [],
  title = "Data Table",
  loading = false,
  onRowClick = null,
  onRowAction = null,
  actionItems = [],
  searchable = true,
  filterable = true,
  exportable = true,
  selectable = false,
  onSelectionChange = null,
  customFilters = [],
  defaultSortColumn = null,
  defaultSortDirection = 'asc',
  rowsPerPageOptions = [5, 10, 25, 50],
  minSearchLength = 2
}) {
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[1] || 10);
  const [orderBy, setOrderBy] = useState(defaultSortColumn || (columns[0]?.id || ''));
  const [order, setOrder] = useState(defaultSortDirection);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Selection state
  const [selected, setSelected] = useState([]);
  
  // Menu state
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);

  // Sorting logic
  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  // Get sorted comparator
  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    const aVal = getNestedValue(a, orderBy);
    const bVal = getNestedValue(b, orderBy);
    
    if (bVal < aVal) return -1;
    if (bVal > aVal) return 1;
    return 0;
  };

  // Get nested object values (e.g., "unit_details.unit_number")
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Search and filter logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && searchTerm.length >= minSearchLength) {
      result = result.filter(row => {
        return columns.some(column => {
          if (!column.searchable) return false;
          const value = getNestedValue(row, column.id);
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([filterKey, filterValue]) => {
      if (filterValue && filterValue !== '' && filterValue.length > 0) {
        result = result.filter(row => {
          const value = getNestedValue(row, filterKey);
          
          if (Array.isArray(filterValue)) {
            return filterValue.includes(value);
          }
          
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    result.sort(getComparator(order, orderBy));

    return result;
  }, [data, searchTerm, filters, order, orderBy, columns, minSearchLength]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  // Selection handlers
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = paginatedData.map(row => row.id);
      setSelected(newSelected);
      onSelectionChange?.(newSelected);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  };

  const handleRowSelect = (event, id) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(selectedId => selectedId !== id);
    }

    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  // Menu handlers
  const handleActionMenuOpen = (event, row) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setActionMenuRow(row);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuRow(null);
  };
  const handleActionClick = (action) => {
    onRowAction?.(action.action, actionMenuRow);
    handleActionMenuClose();
  };

  // Export functionality
  const handleExport = () => {
    const exportData = filteredAndSortedData.map(row => {
      const exportRow = {};
      columns.forEach(column => {
        if (column.exportable !== false) {
          exportRow[column.label] = getNestedValue(row, column.id);
        }
      });
      return exportRow;
    });

    // Simple CSV export
    const headers = columns
      .filter(col => col.exportable !== false)
      .map(col => col.label);
    
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter handlers
  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(0);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;
  const numSelected = selected.length;
  const rowCount = paginatedData.length;

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      {/* Header with search and actions */}      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Typography variant="h6" component="h2" sx={{ mr: 2 }}>
            {title} ({filteredAndSortedData.length})
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
            {filterable && (
              <Button
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                variant={Object.keys(filters).some(key => filters[key]) ? "contained" : "outlined"}
                size="small"
                sx={{ minWidth: 'auto' }}
              >
                Filters
              </Button>
            )}
            
            {exportable && (
              <Button
                startIcon={<ExportIcon />}
                onClick={handleExport}
                variant="outlined"
                size="small"
                sx={{ minWidth: 'auto' }}
              >
                Export
              </Button>
            )}
          </Box>
        </Box>        {/* Search bar */}
        {searchable && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
            <TextField
              placeholder="Search..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ flexGrow: 1, maxWidth: '100%' }}
            />
            
            {(Object.keys(filters).some(key => filters[key]) || searchTerm) && (
              <Button
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
                variant="outlined"
              >
                Clear All
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Advanced Filters */}
      {filterable && (
        <Collapse in={showFilters}>
          <Card variant="outlined" sx={{ m: 2, mt: 0 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Advanced Filters
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {customFilters.map((filter) => (
                  <FormControl key={filter.key} size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>{filter.label}</InputLabel>
                    <Select
                      value={filters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      input={<OutlinedInput label={filter.label} />}
                      multiple={filter.multiple}
                    >
                      <MenuItem value="">
                        <em>All</em>
                      </MenuItem>
                      {filter.options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Collapse>
      )}      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: 'grey.100',
              '& .MuiTableCell-head': {
                fontWeight: 'bold',
                fontSize: '0.875rem',
                color: 'text.primary',
                borderBottom: '2px solid',
                borderBottomColor: 'divider'
              }
            }}>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={numSelected > 0 && numSelected < rowCount}
                    checked={rowCount > 0 && numSelected === rowCount}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                      sx={{ 
                        fontWeight: 'bold',
                        '& .MuiTableSortLabel-icon': {
                          color: 'primary.main !important'
                        }
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              
              {actionItems.length > 0 && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actionItems.length > 0 ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <Typography>Loading...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actionItems.length > 0 ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm || Object.keys(filters).some(key => filters[key])
                        ? 'No results found for your search criteria'
                        : 'No data available'
                      }
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (              paginatedData.map((row, index) => {
                const isItemSelected = isSelected(row.id);
                
                return (
                  <TableRow
                    hover
                    key={row.id || index}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    selected={isItemSelected}
                    sx={{ 
                      cursor: onRowClick ? 'pointer' : 'default',
                      backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5'
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onChange={(event) => handleRowSelect(event, row.id)}
                        />
                      </TableCell>
                    )}
                    
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {column.render
                          ? column.render(getNestedValue(row, column.id), row)
                          : getNestedValue(row, column.id)
                        }
                      </TableCell>
                    ))}
                    
                    {actionItems.length > 0 && (
                      <TableCell align="right">
                        <IconButton
                          onClick={(event) => handleActionMenuOpen(event, row)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={filteredAndSortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >        {actionItems.map((action, index) => (
          <MenuItem
            key={action.action || index}
            onClick={() => handleActionClick(action)}
            sx={{ color: action.color || 'inherit' }}
          >
            {React.createElement(action.icon, { fontSize: 'small', sx: { mr: 1 } })}
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}

export default EnhancedTable;
