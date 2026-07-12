import React, { useState, useMemo } from 'react';

export function MaintenanceTab({
  maintenanceRequests,
  rejectingMaintenanceId,
  setRejectingMaintenanceId,
  maintenanceReason,
  setMaintenanceReason,
  assigningTechId,
  setAssigningTechId,
  technicianName,
  setTechnicianName,
  handleApproveMaintenance,
  handleRejectMaintenance,
  handleAssignTechnician
}) {
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return maintenanceRequests.filter(req => {
      const matchesSearch =
        !q ||
        req.asset?.name?.toLowerCase().includes(q) ||
        req.asset?.assetTag?.toLowerCase().includes(q) ||
        req.raisedBy?.name?.toLowerCase().includes(q) ||
        req.issueDescription?.toLowerCase().includes(q) ||
        req.technicianName?.toLowerCase().includes(q);
      const matchesPriority = !filterPriority || req.priority === filterPriority;
      const matchesStatus = !filterStatus || req.status === filterStatus;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [maintenanceRequests, searchQuery, filterPriority, filterStatus]);

  const hasActiveFilters = searchQuery || filterPriority || filterStatus;

  function clearFilters() {
    setSearchQuery('');
    setFilterPriority('');
    setFilterStatus('');
  }

  return (
    <div>
      <h3>Maintenance Management</h3>

      {rejectingMaintenanceId ? (
        <form onSubmit={handleRejectMaintenance}>
          <h4>Reject Maintenance Request</h4>
          <p>
            <label>Rejection Reason<br />
              <textarea
                value={maintenanceReason}
                onChange={e => setMaintenanceReason(e.target.value)}
                required
              />
            </label>
          </p>
          <button type="submit">Submit Rejection</button>
          <button type="button" onClick={() => { setRejectingMaintenanceId(null); setMaintenanceReason(''); }}>Cancel</button>
        </form>
      ) : null}

      {assigningTechId ? (
        <form onSubmit={handleAssignTechnician}>
          <h4>Assign Technician</h4>
          <p>
            <label>Technician Name<br />
              <input
                type="text"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                required
              />
            </label>
          </p>
          <button type="submit">Assign Technician</button>
          <button type="button" onClick={() => { setAssigningTechId(null); setTechnicianName(''); }}>Cancel</button>
        </form>
      ) : null}

      <hr />
      <h4>Maintenance Requests Directory</h4>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by asset, requester or description…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="maint-priority-filter">Priority</label>
          <select
            id="maint-priority-filter"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="maint-status-filter">Status</label>
          <select
            id="maint-status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="technician_assigned">Technician Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredRequests.length} / {maintenanceRequests.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Raised By</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned Technician</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRequests.length === 0 ? (
            <tr><td colSpan="7">{hasActiveFilters ? 'No requests match the current filters.' : 'No maintenance requests found.'}</td></tr>
          ) : (
            filteredRequests.map(req => (
              <tr key={req.id}>
                <td>{req.asset?.name} ({req.asset?.assetTag})</td>
                <td>{req.raisedBy?.name}</td>
                <td>{req.issueDescription}</td>
                <td>{req.priority}</td>
                <td>{req.status}</td>
                <td>{req.technicianName || 'Unassigned'}</td>
                <td>
                  {req.status === 'pending' ? (
                    <>
                      <button type="button" onClick={() => handleApproveMaintenance(req.id)}>Approve</button>
                      <button type="button" onClick={() => setRejectingMaintenanceId(req.id)}>Reject</button>
                    </>
                  ) : req.status === 'approved' || req.status === 'technician_assigned' ? (
                    <button type="button" onClick={() => setAssigningTechId(req.id)}>Assign Tech</button>
                  ) : (
                    <span>-</span>
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
