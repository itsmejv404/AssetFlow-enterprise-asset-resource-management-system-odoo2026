import React, { useState, useMemo } from 'react';

export function LogsTab({ logs }) {
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');

  // Derive unique action/entityType values from logs for filter dropdowns
  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.entityType).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return logs.filter(log => {
      const actorStr = log.actor ? `${log.actor.name} ${log.actor.role}` : 'system';
      const matchesSearch =
        !q ||
        actorStr.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.entityType?.toLowerCase().includes(q) ||
        String(log.entityId || '').toLowerCase().includes(q);
      const matchesAction = !filterAction || log.action === filterAction;
      const matchesEntityType = !filterEntityType || log.entityType === filterEntityType;
      return matchesSearch && matchesAction && matchesEntityType;
    });
  }, [logs, searchQuery, filterAction, filterEntityType]);

  const hasActiveFilters = searchQuery || filterAction || filterEntityType;

  function clearFilters() {
    setSearchQuery('');
    setFilterAction('');
    setFilterEntityType('');
  }

  return (
    <div>
      <h3>Administrator Audit Logs</h3>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by actor, action or entity…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="log-action-filter">Action</label>
          <select
            id="log-action-filter"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
          >
            <option value="">All</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="log-entity-filter">Entity Type</label>
          <select
            id="log-entity-filter"
            value={filterEntityType}
            onChange={e => setFilterEntityType(e.target.value)}
          >
            <option value="">All</option>
            {uniqueEntityTypes.map(et => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredLogs.length} / {logs.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Entity ID</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length === 0 ? (
            <tr><td colSpan="6">{hasActiveFilters ? 'No logs match the current filters.' : 'No logs recorded.'}</td></tr>
          ) : (
            filteredLogs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actor ? `${log.actor.name} (${log.actor.role})` : 'System'}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.entityId}</td>
                <td>
                  {log.metadata ? (
                    <pre className="m-0 text-xs">{JSON.stringify(log.metadata, null, 2)}</pre>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
