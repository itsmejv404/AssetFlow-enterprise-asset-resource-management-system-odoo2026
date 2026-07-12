import React from 'react';

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
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
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
          {maintenanceRequests.length === 0 ? (
            <tr><td colSpan="7">No maintenance requests found.</td></tr>
          ) : (
            maintenanceRequests.map(req => (
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
