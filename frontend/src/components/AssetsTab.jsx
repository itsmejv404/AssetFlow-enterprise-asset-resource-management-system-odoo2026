import React, { useState, useMemo } from 'react';

export function AssetsTab({
  assets,
  categories,
  editingAsset,
  setEditingAsset,
  editingAssetCustomFields,
  setEditingAssetCustomFields,
  managingAssetDocs,
  setManagingAssetDocs,
  _uploadFile,
  setUploadFile,
  assetForm,
  setAssetForm,
  assetCustomFields,
  setAssetCustomFields,
  handleCreateAsset,
  handleUpdateAsset,
  handleRetireAsset,
  handleDisposeAsset,
  handleDeleteAsset,
  handleUploadDocument,
  handleDeleteDocument
}) {
  // ── Search & Filter state ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBookable, setFilterBookable] = useState('');

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return assets.filter(asset => {
      const matchesSearch =
        !q ||
        asset.name?.toLowerCase().includes(q) ||
        asset.assetTag?.toLowerCase().includes(q) ||
        asset.serialNumber?.toLowerCase().includes(q) ||
        asset.location?.toLowerCase().includes(q);
      const matchesStatus = !filterStatus || asset.status === filterStatus;
      const matchesCategory = !filterCategory || String(asset.category?.id) === filterCategory;
      const matchesBookable =
        filterBookable === '' ||
        (filterBookable === 'bookable' && asset.isBookable) ||
        (filterBookable === 'standard' && !asset.isBookable);
      return matchesSearch && matchesStatus && matchesCategory && matchesBookable;
    });
  }, [assets, searchQuery, filterStatus, filterCategory, filterBookable]);

  const hasActiveFilters = searchQuery || filterStatus || filterCategory || filterBookable !== '';

  function clearFilters() {
    setSearchQuery('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterBookable('');
  }

  // ── Category-specific fields renderer ─────────────────────
  const renderCategoryFields = (selectedCatId, specificFieldsState, setSpecificFieldsState) => {
    const category = categories.find(c => c.id === selectedCatId);
    if (!category || !category.customFieldSchema || category.customFieldSchema.length === 0) {
      return null;
    }

    return (
      <div className="my-3 rounded-lg border border-dashed border-neutral-300 p-3">
        <h5>Category-Specific Fields ({category.name})</h5>
        {category.customFieldSchema.map((field) => {
          const value = specificFieldsState[field.key] ?? '';
          return (
            <p key={field.key}>
              <label>
                {field.key} ({field.type})
                <br />
                {field.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => {
                      setSpecificFieldsState({
                        ...specificFieldsState,
                        [field.key]: e.target.checked
                      });
                    }}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => {
                      setSpecificFieldsState({
                        ...specificFieldsState,
                        [field.key]: e.target.value
                      });
                    }}
                  />
                )}
              </label>
            </p>
          );
        })}
      </div>
    );
  };

  if (managingAssetDocs) {
    return (
      <div>
        <h3>Manage Documents for Asset: {managingAssetDocs.name} ({managingAssetDocs.assetTag})</h3>
        <button type="button" onClick={() => setManagingAssetDocs(null)}>Back to Assets</button>
        
        <div className="mt-5">
          <h4>Uploaded Documents</h4>
          {(!managingAssetDocs.documentUrls || managingAssetDocs.documentUrls.length === 0) ? (
            <p>No documents uploaded yet.</p>
          ) : (
            <ul>
              {managingAssetDocs.documentUrls.map((docUrl, i) => {
                const filename = docUrl.substring(docUrl.lastIndexOf('/') + 1);
                return (
                  <li key={i} className="mb-2">
                    <a href={docUrl} target="_blank" rel="noreferrer">{filename}</a>{' '}
                    <button type="button" onClick={() => handleDeleteDocument(managingAssetDocs.id, docUrl)}>Delete</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <hr />
        <form onSubmit={(e) => handleUploadDocument(e, managingAssetDocs.id)}>
          <h4>Upload New Document</h4>
          <p>
            <label>Select File<br />
              <input
                id="doc-file-input"
                type="file"
                onChange={e => setUploadFile(e.target.files[0])}
                required
              />
            </label>
          </p>
          <button type="submit">Upload Document</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h3>Asset Management</h3>

      {editingAsset ? (
        <form onSubmit={handleUpdateAsset}>
          <h4>Edit Asset</h4>
          <p>
            <label>Name<br />
              <input type="text" value={editingAsset.name} onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })} required />
            </label>
          </p>
          <p>
            <label>Category<br />
              <select value={editingAsset.categoryId} onChange={e => setEditingAsset({ ...editingAsset, categoryId: e.target.value })} required>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>Serial Number<br />
              <input type="text" value={editingAsset.serialNumber || ''} onChange={e => setEditingAsset({ ...editingAsset, serialNumber: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Acquisition Date<br />
              <input type="date" value={editingAsset.acquisitionDate || ''} onChange={e => setEditingAsset({ ...editingAsset, acquisitionDate: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Acquisition Cost<br />
              <input type="number" step="0.01" value={editingAsset.acquisitionCost || ''} onChange={e => setEditingAsset({ ...editingAsset, acquisitionCost: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Condition<br />
              <select value={editingAsset.condition || ''} onChange={e => setEditingAsset({ ...editingAsset, condition: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </label>
          </p>
          <p>
            <label>Location<br />
              <input type="text" value={editingAsset.location || ''} onChange={e => setEditingAsset({ ...editingAsset, location: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Status<br />
              <select value={editingAsset.status} onChange={e => setEditingAsset({ ...editingAsset, status: e.target.value })}>
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" checked={editingAsset.isBookable} onChange={e => setEditingAsset({ ...editingAsset, isBookable: e.target.checked })} />
              Bookable Resource (Hot desk, Meeting room, etc.)
            </label>
          </p>

          {renderCategoryFields(editingAsset.categoryId, editingAssetCustomFields, setEditingAssetCustomFields)}

          <button type="submit">Save Changes</button>
          <button type="button" onClick={() => { setEditingAsset(null); setEditingAssetCustomFields({}); }}>Cancel</button>
        </form>
      ) : (
        <form onSubmit={handleCreateAsset}>
          <h4>Register New Asset</h4>
          <p>
            <label>Name<br />
              <input type="text" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} required />
            </label>
          </p>
          <p>
            <label>Category<br />
              <select value={assetForm.categoryId} onChange={e => setAssetForm({ ...assetForm, categoryId: e.target.value })} required>
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>Serial Number<br />
              <input type="text" value={assetForm.serialNumber} onChange={e => setAssetForm({ ...assetForm, serialNumber: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Acquisition Date<br />
              <input type="date" value={assetForm.acquisitionDate} onChange={e => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Acquisition Cost<br />
              <input type="number" step="0.01" value={assetForm.acquisitionCost} onChange={e => setAssetForm({ ...assetForm, acquisitionCost: e.target.value })} />
            </label>
          </p>
          <p>
            <label>Condition<br />
              <select value={assetForm.condition} onChange={e => setAssetForm({ ...assetForm, condition: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </label>
          </p>
          <p>
            <label>Location<br />
              <input type="text" value={assetForm.location} onChange={e => setAssetForm({ ...assetForm, location: e.target.value })} />
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" checked={assetForm.isBookable} onChange={e => setAssetForm({ ...assetForm, isBookable: e.target.checked })} />
              Bookable Resource (Hot desk, Meeting room, etc.)
            </label>
          </p>

          {renderCategoryFields(assetForm.categoryId, assetCustomFields, setAssetCustomFields)}

          <button type="submit">Register Asset</button>
        </form>
      )}

      <hr />
      <h4>Assets Directory</h4>

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="search-filter-bar">
        <input
          type="search"
          placeholder="🔍  Search by name, tag, serial, location…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 14rem' }}
        />

        <div className="filter-group">
          <label htmlFor="asset-status-filter">Status</label>
          <select
            id="asset-status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="retired">Retired</option>
            <option value="disposed">Disposed</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="asset-category-filter">Category</label>
          <select
            id="asset-category-filter"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map(cat => (
              <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="asset-bookable-filter">Type</label>
          <select
            id="asset-bookable-filter"
            value={filterBookable}
            onChange={e => setFilterBookable(e.target.value)}
          >
            <option value="">All</option>
            <option value="standard">Standard</option>
            <option value="bookable">Bookable</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}

        <span className="result-count-badge">
          {filteredAssets.length} / {assets.length} records
        </span>
      </div>

      <table className="table-with-search">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Category</th>
            <th>Location</th>
            <th>Status</th>
            <th>Type</th>
            <th>Holder</th>
            <th>Docs Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.length === 0 ? (
            <tr><td colSpan="9">{hasActiveFilters ? 'No assets match the current filters.' : 'No assets found.'}</td></tr>
          ) : (
            filteredAssets.map(asset => (
              <tr key={asset.id}>
                <td>{asset.assetTag}</td>
                <td>{asset.name}</td>
                <td>{asset.category?.name}</td>
                <td>{asset.location || '-'}</td>
                <td>{asset.status}</td>
                <td>{asset.isBookable ? 'Bookable' : 'Standard'}</td>
                <td>
                  {asset.currentHolderEmployee
                    ? `Employee: ${asset.currentHolderEmployee.name}`
                    : asset.currentHolderDepartment
                    ? `Dept: ${asset.currentHolderDepartment.name}`
                    : 'None'}
                </td>
                <td>{asset.documentUrls ? asset.documentUrls.length : 0}</td>
                <td>
                  <button type="button" onClick={() => {
                    setEditingAsset({
                      id: asset.id,
                      name: asset.name,
                      categoryId: asset.category?.id || '',
                      serialNumber: asset.serialNumber,
                      acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.split('T')[0] : '',
                      acquisitionCost: asset.acquisitionCost,
                      condition: asset.condition,
                      location: asset.location,
                      isBookable: asset.isBookable,
                      status: asset.status
                    });
                    setEditingAssetCustomFields(asset.categorySpecificFields || {});
                  }}>Edit</button>
                  <button type="button" onClick={() => setManagingAssetDocs(asset)}>Manage Docs</button>
                  {asset.status !== 'retired' && asset.status !== 'disposed' ? (
                    <>
                      <button type="button" onClick={() => handleRetireAsset(asset.id)}>Retire</button>
                      <button type="button" onClick={() => handleDisposeAsset(asset.id)}>Dispose</button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => handleDeleteAsset(asset.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
