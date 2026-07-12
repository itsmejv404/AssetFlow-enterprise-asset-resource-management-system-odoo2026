import React from 'react';

export function CategoriesTab({
  categories,
  catForm,
  setCatForm,
  schemaFields,
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
            <div style={{ margin: '15px 0' }}>
              <strong>Custom Field Schema:</strong>{' '}
              <button type="button" onClick={addSchemaField}>Add Field</button>
              {schemaFields.map((field, idx) => (
                <div key={idx} style={{ marginTop: '5px' }}>
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
            <button type="button" onClick={() => { setEditingCat(null); setSchemaFields([]); }}>Cancel</button>
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
            <div style={{ margin: '15px 0' }}>
              <strong>Custom Field Schema:</strong>{' '}
              <button type="button" onClick={addSchemaField}>Add Field</button>
              {schemaFields.map((field, idx) => (
                <div key={idx} style={{ marginTop: '5px' }}>
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
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
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
          {categories.length === 0 ? (
            <tr><td colSpan={isAdmin ? 5 : 4}>No categories found.</td></tr>
          ) : (
            categories.map(cat => (
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
                      setSchemaFields(cat.customFieldSchema ? [...cat.customFieldSchema] : []);
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
