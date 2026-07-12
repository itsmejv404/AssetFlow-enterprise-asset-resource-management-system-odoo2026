import React from 'react';

export function EmployeesTab({
  employees,
  departments,
  promotingEmp,
  setPromotingEmp,
  promoteRole,
  setPromoteRole,
  promoteDeptId,
  setPromoteDeptId,
  editingEmp,
  setEditingEmp,
  empForm,
  setEmpForm,
  handleCreateEmployee,
  handleUpdateEmployee,
  handleDeactivateEmployee,
  handleReactivateEmployee,
  handleDeleteEmployee,
  handleChangeRole,
  isAdmin = true
}) {
  return (
    <div>
      <h3>Employee Management</h3>

      {isAdmin && (
        promotingEmp ? (
          <form onSubmit={handleChangeRole}>
            <h4>Change Role for Employee: {promotingEmp.name}</h4>
            <p>
              <label>Role<br />
                <select value={promoteRole} onChange={e => setPromoteRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="asset_manager">Asset Manager</option>
                  <option value="department_head">Department Head</option>
                </select>
              </label>
            </p>
            <p>
              <label>Department (Optional for Employee/Asset Manager, Required for Department Head)<br />
                <select value={promoteDeptId} onChange={e => setPromoteDeptId(e.target.value)} required={promoteRole === 'department_head'}>
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </p>
            <button type="submit">Change Role</button>
            <button type="button" onClick={() => { setPromotingEmp(null); setPromoteDeptId(''); }}>Cancel</button>
          </form>
        ) : editingEmp ? (
          <form onSubmit={handleUpdateEmployee}>
            <h4>Edit Employee</h4>
            <p>
              <label>Name<br />
                <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({ ...editingEmp, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Email<br />
                <input type="email" value={editingEmp.email} onChange={e => setEditingEmp({ ...editingEmp, email: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Department<br />
                <select value={editingEmp.departmentId || ''} onChange={e => setEditingEmp({ ...editingEmp, departmentId: e.target.value })}>
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </p>
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setEditingEmp(null)}>Cancel</button>
          </form>
        ) : (
          <form onSubmit={handleCreateEmployee}>
            <h4>Create Employee (Provision Account)</h4>
            <p>
              <label>Name<br />
                <input type="text" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Email<br />
                <input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Department<br />
                <select value={empForm.departmentId} onChange={e => setEmpForm({ ...empForm, departmentId: e.target.value })}>
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>Role<br />
                <select value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}>
                  <option value="employee">Employee</option>
                  <option value="asset_manager">Asset Manager</option>
                  <option value="department_head">Department Head</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
            </p>
            <button type="submit">Create Employee</button>
          </form>
        )
      )}

      <hr />
      <h4>Employee Directory</h4>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr><td colSpan={isAdmin ? 7 : 6}>No employees found.</td></tr>
          ) : (
            employees.map(emp => (
              <tr key={emp.id}>
                <td>{emp.employeeCode}</td>
                <td>{emp.name}</td>
                <td>{emp.user?.email || '-'}</td>
                <td>{emp.department?.name || 'None'}</td>
                <td>{emp.role}</td>
                <td>{emp.isActive ? 'Active' : 'Inactive'}</td>
                {isAdmin && (
                  <td>
                    <button type="button" onClick={() => setEditingEmp({
                      id: emp.id,
                      name: emp.name,
                      email: emp.user?.email || '',
                      departmentId: emp.department?.id || ''
                    })}>Edit</button>
                    {emp.isActive ? (
                      <button type="button" onClick={() => handleDeactivateEmployee(emp.id)}>Deactivate</button>
                    ) : (
                      <button type="button" onClick={() => handleReactivateEmployee(emp.id)}>Reactivate</button>
                    )}
                    <button type="button" onClick={() => handleDeleteEmployee(emp.id)}>Delete</button>
                    {emp.role !== 'admin' ? (
                      <button type="button" onClick={() => {
                        setPromotingEmp(emp);
                        setPromoteRole(emp.role);
                        setPromoteDeptId(emp.department?.id || '');
                      }}>Change Role</button>
                    ) : null}
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
