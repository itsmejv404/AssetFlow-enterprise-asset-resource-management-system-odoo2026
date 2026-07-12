import React, { useState, useMemo } from 'react';

export function AuditsTab({
  auditCycles,
  departments,
  employees,
  auditCycleForm,
  setAuditCycleForm,
  assigningAuditorsCycle,
  setAssigningAuditorsCycle,
  selectedAuditors,
  setSelectedAuditors,
  handleCreateAuditCycle,
  handleStartAuditCycle,
  handleAssignAuditors,
  handleCloseAuditCycle,
  isAdmin = true
}) {
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredCycles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return auditCycles.filter(cycle => {
      const matchesSearch =
        !q ||
        cycle.name?.toLowerCase().includes(q) ||
        cycle.scopeLocation?.toLowerCase().includes(q) ||
        cycle.scopeDepartment?.name?.toLowerCase().includes(q) ||
        cycle.auditors?.some(a => a.name?.toLowerCase().includes(q));
      const matchesStatus = !filterStatus || cycle.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [auditCycles, searchQuery, filterStatus]);

  const hasActiveFilters = searchQuery || filterStatus;

  function clearFilters() {
    setSearchQuery('');
    setFilterStatus('');
  }

  return (
    <div>
      <h3>Audit Cycles Management</h3>

      {isAdmin && (
        assigningAuditorsCycle ? (
          <form onSubmit={handleAssignAuditors}>
            <h4>Assign Auditors to "{assigningAuditorsCycle.name}"</h4>
            <p>
              <button
                type="button"
                onClick={() => {
                  const allEmpIds = employees.map(emp => emp.id);
                  setSelectedAuditors(allEmpIds);
                }}
              >
                Select All Auditors
              </button>
              {' '}
              <button type="button" onClick={() => setSelectedAuditors([])}>Clear Selection</button>
            </p>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-neutral-200 p-3">
              {employees.map(emp => {
                const isChecked = selectedAuditors.includes(emp.id);
                return (
                  <p key={emp.id} className="my-1">
                    <label>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAuditors([...selectedAuditors, emp.id]);
                          } else {
                            setSelectedAuditors(selectedAuditors.filter(id => id !== emp.id));
                          }
                        }}
                      />
                      {emp.name} ({emp.employeeCode} - {emp.role})
                    </label>
                  </p>
                );
              })}
            </div>
            <p className="mt-2">
              <button type="submit">Save Auditors</button>
              <button type="button" onClick={() => { setAssigningAuditorsCycle(null); setSelectedAuditors([]); }}>Cancel</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCreateAuditCycle}>
            <h4>Create New Audit Cycle</h4>
            <p>
              <label>Cycle Name<br />
                <input
                  type="text"
                  value={auditCycleForm.name}
                  onChange={e => setAuditCycleForm({ ...auditCycleForm, name: e.target.value })}
                  placeholder="e.g. Q3 Laptop Audit"
                  required
                />
              </label>
            </p>
            <p>
              <label>Scope Department (Optional)<br />
                <select
                  value={auditCycleForm.scopeDepartmentId}
                  onChange={e => setAuditCycleForm({ ...auditCycleForm, scopeDepartmentId: e.target.value })}
                >
                  <option value="">-- All Departments --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>Scope Location (Optional)<br />
                <input
                  type="text"
                  value={auditCycleForm.scopeLocation}
                  onChange={e => setAuditCycleForm({ ...auditCycleForm, scopeLocation: e.target.value })}
                  placeholder="e.g. Garage A"
                />
              </label>
            </p>
            <p>
              <label>Start Date<br />
                <input
                  type="date"
                  value={auditCycleForm.startDate}
                  onChange={e => setAuditCycleForm({ ...auditCycleForm, startDate: e.target.value })}
                  required
                />
              </label>
            </p>
            <p>
              <label>End Date<br />
                <input
                  type="date"
                  value={auditCycleForm.endDate}
                  onChange={e => setAuditCycleForm({ ...auditCycleForm, endDate: e.target.value })}
                  required
                />
              </label>
            </p>
            <button type="submit">Create Audit Cycle</button>
          </form>
        )
      )}

      <hr />
      <h4>Audit Cycles Directory</h4>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by name, location or auditor…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="audit-status-filter">Status</label>
          <select
            id="audit-status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredCycles.length} / {auditCycles.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Name</th>
            <th>Scope Department</th>
            <th>Scope Location</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Auditors Assigned</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredCycles.length === 0 ? (
            <tr><td colSpan={isAdmin ? 7 : 6}>{hasActiveFilters ? 'No audit cycles match the current filters.' : 'No audit cycles found.'}</td></tr>
          ) : (
            filteredCycles.map(cycle => (
              <tr key={cycle.id}>
                <td>{cycle.name}</td>
                <td>{cycle.scopeDepartment?.name || 'All'}</td>
                <td>{cycle.scopeLocation || 'All'}</td>
                <td>{new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}</td>
                <td>{cycle.status}</td>
                <td>{cycle.auditors ? cycle.auditors.map(a => a.name).join(', ') || 'None' : 'None'}</td>
                {isAdmin && (
                  <td>
                    {cycle.status === 'planned' ? (
                      <>
                        <button type="button" onClick={() => handleStartAuditCycle(cycle.id)}>Start Cycle</button>
                        <button type="button" onClick={() => {
                          setAssigningAuditorsCycle(cycle);
                          setSelectedAuditors(cycle.auditors ? cycle.auditors.map(a => a.id) : []);
                        }}>Assign Auditors</button>
                      </>
                    ) : cycle.status === 'in_progress' ? (
                      <>
                        <button type="button" onClick={() => handleCloseAuditCycle(cycle.id)}>Close Cycle</button>
                        <button type="button" onClick={() => {
                          setAssigningAuditorsCycle(cycle);
                          setSelectedAuditors(cycle.auditors ? cycle.auditors.map(a => a.id) : []);
                        }}>Assign Auditors</button>
                      </>
                    ) : (
                      <span>Closed</span>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
