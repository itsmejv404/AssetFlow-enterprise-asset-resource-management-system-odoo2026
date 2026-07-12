import React, { useState, useMemo } from 'react';

export function CategoriesTab({
  categories,
  catForm,
  setCatForm,
  schemaFields,
  setSchemaFields,
  addSchemaField,
  removeSchemaField,
  updateSchemaField,
  editingCat,
  setEditingCat,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeactivateCategory,
  handleDeleteCategory,
  isAdmin = true
}) {
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return categories.filter(cat => {
      const matchesSearch =
        !q ||
        cat.name?.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q) ||
        cat.customFieldSchema?.some(f => f.key?.toLowerCase().includes(q));
      const matchesActive =
        filterActive === '' ||
        (filterActive === 'active' && cat.isActive) ||
        (filterActive === 'inactive' && !cat.isActive);
      return matchesSearch && matchesActive;
    });
  }, [categories, searchQuery, filterActive]);

  const hasActiveFilters = searchQuery || filterActive !== '';

  function clearFilters() {
    setSearchQuery('');
    setFilterActive('');
  }

  return (
    <div>
      <h3>Asset Category Management</h3>
      
      {isAdmin && (
        editingCat ? (
          <form onSubmit={handleUpdateCategory}>
            <h4>Edit Category</h4>
            <p>
              <label>Name<br />
                <input type="text" value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Description<br />
                <textarea value={editingCat.description || ''} onChange={e => setEditingCat({ ...editingCat, description: e.target.value })} />
              </label>
            </p>
            <div className="my-4 grid gap-2">
              <strong>Custom Field Schema:</strong>{' '}
              <button type="button" onClick={addSchemaField}>Add Field</button>
              {schemaFields.map((field, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
                  <input
                    type="text"
                    placeholder="Field Key (e.g. ram)"
                    value={field.key}
                    onChange={(e) => updateSchemaField(idx, 'key', e.target.value)}
                    required
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateSchemaField(idx, 'type', e.target.value)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button type="button" onClick={() => removeSchemaField(idx)}>Remove</button>
                </div>
              ))}
            </div>
            <p>
              <label>
                <input type="checkbox" checked={editingCat.isActive} onChange={e => setEditingCat({ ...editingCat, isActive: e.target.checked })} />
                Active
              </label>
            </p>
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => { setEditingCat(null); }}>Cancel</button>
          </form>
        ) : (
          <form onSubmit={handleCreateCategory}>
            <h4>Create Asset Category</h4>
            <p>
              <label>Name<br />
                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
              </label>
            </p>
            <p>
              <label>Description<br />
                <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} />
              </label>
            </p>
            <div className="my-4 grid gap-2">
              <strong>Custom Field Schema:</strong>{' '}
              <button type="button" onClick={addSchemaField}>Add Field</button>
              {schemaFields.map((field, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
                  <input
                    type="text"
                    placeholder="Field Key (e.g. ram)"
                    value={field.key}
                    onChange={(e) => updateSchemaField(idx, 'key', e.target.value)}
                    required
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateSchemaField(idx, 'type', e.target.value)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <button type="button" onClick={() => removeSchemaField(idx)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="submit">Create</button>
          </form>
        )
      )}

      <hr />
      <h4>Asset Categories Directory</h4>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by name, description or field key…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="cat-active-filter">Status</label>
          <select
            id="cat-active-filter"
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
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
          {filteredCategories.length} / {categories.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Custom Field Schema</th>
            <th>Status</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredCategories.length === 0 ? (
            <tr><td colSpan={isAdmin ? 5 : 4}>{hasActiveFilters ? 'No categories match the current filters.' : 'No categories found.'}</td></tr>
          ) : (
            filteredCategories.map(cat => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.description || '-'}</td>
                <td>
                  {cat.customFieldSchema && cat.customFieldSchema.length > 0 ? (
                    <ul>
                      {cat.customFieldSchema.map((field, i) => (
                        <li key={i}>{field.key} ({field.type})</li>
                      ))}
                    </ul>
                  ) : (
                    'None'
                  )}
                </td>
                <td>{cat.isActive ? 'Active' : 'Inactive'}</td>
                {isAdmin && (
                  <td>
                    <button type="button" onClick={() => {
                      setEditingCat(cat);
                      if (setSchemaFields) {
                        setSchemaFields(cat.customFieldSchema ? [...cat.customFieldSchema] : []);
                      }
                    }}>Edit</button>
                    {cat.isActive ? (
                      <button type="button" onClick={() => handleDeactivateCategory(cat.id)}>Deactivate</button>
                    ) : null}
                    <button type="button" onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
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
