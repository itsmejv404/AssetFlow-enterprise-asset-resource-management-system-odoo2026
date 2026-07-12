import React from 'react';

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
  return (
    <div>
      <h3>Resource Allocation & Transfers</h3>

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
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
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
          {allocations.length === 0 ? (
            <tr><td colSpan="6">No resource allocations found.</td></tr>
          ) : (
            allocations.map(alloc => (
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
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
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
          {transfers.length === 0 ? (
            <tr><td colSpan="7">No transfer requests found.</td></tr>
          ) : (
            transfers.map(req => (
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
