import React, { useState, useMemo } from 'react';

export function AllocationsTab({
  allocations,
  transfers,
  assets,
  employees,
  departments,
  allocationForm,
  setAllocationForm,
  handleCreateAllocation,
  handleApproveTransfer,
  handleRejectTransfer
}) {
  // ── Allocations search & filter ────────────────────────────
  const [allocSearch, setAllocSearch] = useState('');
  const [allocStatus, setAllocStatus] = useState('');

  const filteredAllocations = useMemo(() => {
    const q = allocSearch.toLowerCase();
    return allocations.filter(alloc => {
      const matchesSearch =
        !q ||
        alloc.asset?.name?.toLowerCase().includes(q) ||
        alloc.asset?.assetTag?.toLowerCase().includes(q) ||
        alloc.allocatedToEmployee?.name?.toLowerCase().includes(q) ||
        alloc.allocatedToDepartment?.name?.toLowerCase().includes(q);
      const matchesStatus = !allocStatus || alloc.status === allocStatus;
      return matchesSearch && matchesStatus;
    });
  }, [allocations, allocSearch, allocStatus]);

  const hasAllocFilters = allocSearch || allocStatus;

  function clearAllocFilters() {
    setAllocSearch('');
    setAllocStatus('');
  }

  // ── Transfers search & filter ──────────────────────────────
  const [transferSearch, setTransferSearch] = useState('');
  const [transferStatus, setTransferStatus] = useState('');

  const filteredTransfers = useMemo(() => {
    const q = transferSearch.toLowerCase();
    return transfers.filter(req => {
      const matchesSearch =
        !q ||
        req.asset?.name?.toLowerCase().includes(q) ||
        req.asset?.assetTag?.toLowerCase().includes(q) ||
        req.requestedBy?.name?.toLowerCase().includes(q) ||
        req.requestedToEmployee?.name?.toLowerCase().includes(q) ||
        req.requestedToDepartment?.name?.toLowerCase().includes(q) ||
        req.reason?.toLowerCase().includes(q);
      const matchesStatus = !transferStatus || req.status === transferStatus;
      return matchesSearch && matchesStatus;
    });
  }, [transfers, transferSearch, transferStatus]);

  const hasTransferFilters = transferSearch || transferStatus;

  function clearTransferFilters() {
    setTransferSearch('');
    setTransferStatus('');
  }

  return (
    <div>
      <h3>Resource Allocation &amp; Transfers</h3>

      <form onSubmit={handleCreateAllocation}>
        <h4>Allocate Available Resource (Direct)</h4>
        <p>
          <label>Select Asset<br />
            <select
              value={allocationForm.assetId}
              onChange={e => setAllocationForm({ ...allocationForm, assetId: e.target.value })}
              required
            >
              <option value="">-- Choose Asset --</option>
              {assets.filter(a => a.status !== 'retired' && a.status !== 'disposed').map(a => (
                <option key={a.id} value={a.id}>{a.name} (Tag: {a.assetTag}, Serial: {a.serialNumber}, Status: {a.status})</option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>Allocate To Employee (Optional)<br />
            <select
              value={allocationForm.employeeId}
              onChange={e => setAllocationForm({ ...allocationForm, employeeId: e.target.value })}
            >
              <option value="">-- None (Or Choose Employee) --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>Allocate To Department (Optional)<br />
            <select
              value={allocationForm.departmentId}
              onChange={e => setAllocationForm({ ...allocationForm, departmentId: e.target.value })}
            >
              <option value="">-- None (Or Choose Department) --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>Expected Return Date (Optional)<br />
            <input
              type="date"
              value={allocationForm.expectedReturnDate}
              onChange={e => setAllocationForm({ ...allocationForm, expectedReturnDate: e.target.value })}
            />
          </label>
        </p>
        <button type="submit">Allocate Resource</button>
      </form>

      <hr />
      <h4>Active Allocations Directory</h4>

      {/* ── Allocations Search & Filter Bar ─────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by asset, employee or department…"
          value={allocSearch}
          onChange={e => setAllocSearch(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="alloc-status-filter">Status</label>
          <select
            id="alloc-status-filter"
            value={allocStatus}
            onChange={e => setAllocStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>

        {hasAllocFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearAllocFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredAllocations.length} / {allocations.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Allocated To</th>
            <th>Allocated Date</th>
            <th>Expected Return</th>
            <th>Allocated By</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredAllocations.length === 0 ? (
            <tr><td colSpan="6">{hasAllocFilters ? 'No allocations match the current filters.' : 'No resource allocations found.'}</td></tr>
          ) : (
            filteredAllocations.map(alloc => (
              <tr key={alloc.id}>
                <td>{alloc.asset?.name} ({alloc.asset?.assetTag})</td>
                <td>
                  {alloc.allocatedToEmployee
                    ? `Employee: ${alloc.allocatedToEmployee.name}`
                    : alloc.allocatedToDepartment
                    ? `Department: ${alloc.allocatedToDepartment.name}`
                    : 'None'}
                </td>
                <td>{new Date(alloc.allocatedDate).toLocaleDateString()}</td>
                <td>{alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate).toLocaleDateString() : '-'}</td>
                <td>{alloc.allocatedBy?.name || 'System'}</td>
                <td>{alloc.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <hr />
      <h4>Transfer Requests Directory</h4>

      {/* ── Transfers Search & Filter Bar ────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by asset, requester or reason…"
          value={transferSearch}
          onChange={e => setTransferSearch(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="transfer-status-filter">Status</label>
          <select
            id="transfer-status-filter"
            value={transferStatus}
            onChange={e => setTransferStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {hasTransferFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearTransferFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredTransfers.length} / {transfers.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Current Allocation</th>
            <th>Requested By</th>
            <th>Target Holder</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransfers.length === 0 ? (
            <tr><td colSpan="7">{hasTransferFilters ? 'No transfers match the current filters.' : 'No transfer requests found.'}</td></tr>
          ) : (
            filteredTransfers.map(req => (
              <tr key={req.id}>
                <td>{req.asset?.name} ({req.asset?.assetTag})</td>
                <td>
                  {req.currentAllocation?.allocatedToEmployee
                    ? `Employee: ${req.currentAllocation.allocatedToEmployee.name}`
                    : req.currentAllocation?.allocatedToDepartment
                    ? `Dept: ${req.currentAllocation.allocatedToDepartment.name}`
                    : 'Unallocated'}
                </td>
                <td>{req.requestedBy?.name}</td>
                <td>
                  {req.requestedToEmployee
                    ? `Employee: ${req.requestedToEmployee.name}`
                    : req.requestedToDepartment
                    ? `Dept: ${req.requestedToDepartment.name}`
                    : '-'}
                </td>
                <td>{req.reason || '-'}</td>
                <td>{req.status}</td>
                <td>
                  {req.status === 'requested' ? (
                    <>
                      <button type="button" onClick={() => handleApproveTransfer(req.id)}>Approve</button>
                      <button type="button" onClick={() => handleRejectTransfer(req.id)}>Reject</button>
                    </>
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
