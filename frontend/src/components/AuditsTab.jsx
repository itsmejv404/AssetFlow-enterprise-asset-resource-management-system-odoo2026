import React from 'react';

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
  handleCloseAuditCycle
}) {
  return (
    <div>
      <h3>Audit Cycles Management</h3>

      {assigningAuditorsCycle ? (
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
          <div style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
            {employees.map(emp => {
              const isChecked = selectedAuditors.includes(emp.id);
              return (
                <p key={emp.id} style={{ margin: '5px 0' }}>
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
          <p style={{ marginTop: '10px' }}>
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
      )}

      <hr />
      <h4>Audit Cycles Directory</h4>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Scope Department</th>
            <th>Scope Location</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Auditors Assigned</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {auditCycles.length === 0 ? (
            <tr><td colSpan="7">No audit cycles found.</td></tr>
          ) : (
            auditCycles.map(cycle => (
              <tr key={cycle.id}>
                <td>{cycle.name}</td>
                <td>{cycle.scopeDepartment?.name || 'All'}</td>
                <td>{cycle.scopeLocation || 'All'}</td>
                <td>{new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}</td>
                <td>{cycle.status}</td>
                <td>{cycle.auditors ? cycle.auditors.map(a => a.name).join(', ') || 'None' : 'None'}</td>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
