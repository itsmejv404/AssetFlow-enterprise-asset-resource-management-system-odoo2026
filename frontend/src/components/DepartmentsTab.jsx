import React from 'react';

export function DepartmentsTab({
  departments,
  employees,
  deptForm,
  setDeptForm,
  editingDept,
  setEditingDept,
  handleCreateDept,
  handleUpdateDept,
  handleDeactivateDept,
  handleDeleteDept,
  isAdmin = true
}) {
  return (
    <div>
      <h3>Department Management</h3>
      
      {isAdmin && (
        editingDept ? (
          <form onSubmit={handleUpdateDept}>
            <h4>Edit Department</h4>
            <p>
              <label>Name<br />
                <input type="text" value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Code<br />
                <input type="text" value={editingDept.code} onChange={e => setEditingDept({ ...editingDept, code: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Parent Department<br />
                <select value={editingDept.parentDepartmentId || ''} onChange={e => setEditingDept({ ...editingDept, parentDepartmentId: e.target.value })}>
                  <option value="">None</option>
                  {departments.filter(d => d.id !== editingDept.id).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>Department Head<br />
                <select value={editingDept.departmentHeadId || ''} onChange={e => setEditingDept({ ...editingDept, departmentHeadId: e.target.value })}>
                  <option value="">None</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>Status<br />
                <select value={editingDept.status} onChange={e => setEditingDept({ ...editingDept, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </p>
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setEditingDept(null)}>Cancel</button>
          </form>
        ) : (
          <form onSubmit={handleCreateDept}>
            <h4>Create Department</h4>
            <p>
              <label>Name<br />
                <input type="text" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Code<br />
                <input type="text" value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Parent Department<br />
                <select value={deptForm.parentDepartmentId} onChange={e => setDeptForm({ ...deptForm, parentDepartmentId: e.target.value })}>
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </label>
            </p>
            <button type="submit">Create</button>
          </form>
        )
      )}

      <hr />
      <h4>Department Directory</h4>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Status</th>
            <th>Head</th>
            <th>Parent Department</th>
            <th>Employees Count</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {departments.length === 0 ? (
            <tr><td colSpan={isAdmin ? 7 : 6}>No departments found.</td></tr>
          ) : (
            departments.map(dept => (
              <tr key={dept.id}>
                <td>{dept.name}</td>
                <td>{dept.code}</td>
                <td>{dept.status}</td>
                <td>{dept.departmentHead?.name || 'None'}</td>
                <td>{dept.parentDepartment?.name || 'None'}</td>
                <td>{dept.employeeCount}</td>
                {isAdmin && (
                  <td>
                    <button type="button" onClick={() => setEditingDept({
                      id: dept.id,
                      name: dept.name,
                      code: dept.code,
                      parentDepartmentId: dept.parentDepartment?.id || '',
                      departmentHeadId: dept.departmentHead?.id || '',
                      status: dept.status
                    })}>Edit</button>
                    {dept.status === 'active' ? (
                      <button type="button" onClick={() => handleDeactivateDept(dept.id)}>Deactivate</button>
                    ) : null}
                    <button type="button" onClick={() => handleDeleteDept(dept.id)}>Delete</button>
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
