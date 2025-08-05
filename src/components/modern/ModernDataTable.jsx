/**
 * Modern Data Table Component
 * Inspired by GitHub, Linear, and Notion tables
 * 
 * Features:
 * - Clean, scannable design
 * - Smart sorting and filtering
 * - Progressive disclosure of details
 * - Responsive design with mobile adaptations
 * - Bulk actions and selection
 * - Keyboard navigation support
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  X
} from 'lucide-react';

const ModernDataTable = ({ 
  data = [], 
  columns = [], 
  title = "Data Table",
  subtitle = "",
  searchable = true,
  filterable = true,
  sortable = true,
  selectable = false,
  actions = [],
  onRowClick,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery) {
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row => {
          const rowValue = row[key];
          if (Array.isArray(value)) {
            return value.includes(rowValue);
          }
          return rowValue === value;
        });
      }
    });

    return result;
  }, [data, searchQuery, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const isAscending = sortConfig.direction === 'asc';
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return isAscending ? aValue - bValue : bValue - aValue;
      }

      const aString = aValue?.toString() || '';
      const bString = bValue?.toString() || '';
      
      return isAscending 
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { key: null, direction: null };
        }
      }
      return { key, direction: 'asc' };
    });
  };

  // Handle row selection
  const handleRowSelect = (rowId) => {
    if (!selectable) return;
    
    setSelectedRows(current => {
      const newSelection = new Set(current);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
      } else {
        newSelection.add(rowId);
      }
      return newSelection;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map(row => row.id)));
    }
  };

  // Render cell content
  const renderCell = (row, column) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    if (column.type === 'badge') {
      const badgeClass = column.getBadgeClass ? column.getBadgeClass(value) : 'badge-primary';
      return <span className={`badge ${badgeClass}`}>{value}</span>;
    }

    if (column.type === 'number') {
      return <span className="font-mono text-sm">{value?.toLocaleString()}</span>;
    }

    if (column.type === 'date') {
      return <span className="text-sm">{new Date(value).toLocaleDateString()}</span>;
    }

    return <span className="text-sm">{value}</span>;
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="heading-4 mb-1">{title}</h3>
            {subtitle && <p className="text-small text-muted">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="input pl-10 pr-4 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {/* Filter Toggle */}
            {filterable && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-ghost ${showFilters ? 'bg-gray-100' : ''}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            )}

            {/* Actions */}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}
                title={action.tooltip}
              >
                {action.icon && <action.icon className="w-4 h-4" />}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {showFilters && filterable && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns
                .filter(col => col.filterable)
                .map(column => (
                  <div key={column.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {column.label}
                    </label>
                    {column.filterType === 'select' ? (
                      <select
                        className="input"
                        value={filters[column.key] || ''}
                        onChange={(e) => setFilters(current => ({
                          ...current,
                          [column.key]: e.target.value || undefined
                        }))}
                      >
                        <option value="">All</option>
                        {column.filterOptions?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input"
                        placeholder={`Filter by ${column.label.toLowerCase()}...`}
                        value={filters[column.key] || ''}
                        onChange={(e) => setFilters(current => ({
                          ...current,
                          [column.key]: e.target.value || undefined
                        }))}
                      />
                    )}
                  </div>
                ))}
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFilters({})}
                className="btn-ghost btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Selection Info */}
        {selectable && selectedRows.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button className="btn-ghost btn-sm text-blue-700">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button className="btn-ghost btn-sm text-red-700">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {sortable && column.sortable !== false && (
                      <div className="flex flex-col">
                        <ArrowUp
                          className={`w-3 h-3 ${
                            sortConfig.key === column.key && sortConfig.direction === 'asc'
                              ? 'text-gray-800'
                              : 'text-gray-300'
                          }`}
                        />
                        <ArrowDown
                          className={`w-3 h-3 -mt-1 ${
                            sortConfig.key === column.key && sortConfig.direction === 'desc'
                              ? 'text-gray-800'
                              : 'text-gray-300'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr
                key={row.id || index}
                className={`hover:bg-gray-50 transition-colors ${
                  selectedRows.has(row.id) ? 'bg-blue-50' : ''
                } ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelect(row.id);
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 whitespace-nowrap">
                    {renderCell(row, column)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <div className="relative group">
                      <button className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown menu would go here */}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
            </span>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="btn-ghost btn-sm"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setCurrentPage(current => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="btn-ghost btn-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm text-gray-700 mx-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(current => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost btn-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-ghost btn-sm"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton for the table
const TableSkeleton = () => {
  return (
    <div className="card animate-pulse">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(5)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-gray-200">
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModernDataTable;