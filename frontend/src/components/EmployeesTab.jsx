import React, { useState, useMemo } from 'react';

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
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(emp => {
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q) ||
        emp.user?.email?.toLowerCase().includes(q) ||
        emp.department?.name?.toLowerCase().includes(q);
      const matchesDept = !filterDept || String(emp.department?.id) === filterDept;
      const matchesRole = !filterRole || emp.role === filterRole;
      const matchesStatus =
        filterStatus === '' ||
        (filterStatus === 'active' && emp.isActive) ||
        (filterStatus === 'inactive' && !emp.isActive);
      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, filterDept, filterRole, filterStatus]);

  const hasActiveFilters = searchQuery || filterDept || filterRole || filterStatus !== '';

  function clearFilters() {
    setSearchQuery('');
    setFilterDept('');
    setFilterRole('');
    setFilterStatus('');
  }

  // Unique department list for filter dropdown (from employees data)
  const departmentOptions = useMemo(() => {
    const seen = new Set();
    return departments.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [departments]);

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

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by name, email or code…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="emp-dept-filter">Department</label>
          <select
            id="emp-dept-filter"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">All</option>
            {departmentOptions.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="emp-role-filter">Role</label>
          <select
            id="emp-role-filter"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">All</option>
            <option value="employee">Employee</option>
            <option value="asset_manager">Asset Manager</option>
            <option value="department_head">Department Head</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="emp-status-filter">Status</label>
          <select
            id="emp-status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredEmployees.length} / {employees.length} records
        </span>
      </div>

      <table className="table-with-search">
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
          {filteredEmployees.length === 0 ? (
            <tr><td colSpan={isAdmin ? 7 : 6}>{hasActiveFilters ? 'No employees match the current filters.' : 'No employees found.'}</td></tr>
          ) : (
            filteredEmployees.map(emp => (
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
