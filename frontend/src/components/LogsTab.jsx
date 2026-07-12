import React from 'react';

export function LogsTab({ logs }) {
  return (
    <div>
      <h3>Administrator Audit Logs</h3>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Entity ID</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan="6">No logs recorded.</td></tr>
          ) : (
            logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actor ? `${log.actor.name} (${log.actor.role})` : 'System'}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.entityId}</td>
                <td>
                  {log.metadata ? (
                    <pre style={{ margin: 0, fontSize: '11px' }}>{JSON.stringify(log.metadata, null, 2)}</pre>
                  ) : (
                    '-'
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
