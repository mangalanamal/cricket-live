'use client';
import { useEffect, useState } from 'react';
import { getUsers, updateUserRole } from '@/lib/firestore';
import { adminCreateUser } from '@/lib/auth';
import { UserProfile } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  // New User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'scorer' | 'viewer'>('viewer');
  const [submitting, setSubmitting] = useState(false);

  const reload = () => getUsers().then(u => { setUsers(u); setLoading(false); });
  useEffect(() => { reload(); }, []);

  const handleRoleChange = async (uid: string, role: 'admin' | 'scorer' | 'viewer') => {
    try {
      await updateUserRole(uid, role);
      setMsg('User role updated successfully');
      setIsSuccess(true);
      reload();
    } catch (e) {
      setMsg('Error updating role');
      setIsSuccess(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      setMsg('Email and Password are required');
      setIsSuccess(false);
      return;
    }
    if (newPassword.length < 6) {
      setMsg('Password must be at least 6 characters');
      setIsSuccess(false);
      return;
    }

    setSubmitting(true);
    setMsg('');
    try {
      await adminCreateUser(newEmail, newPassword, newRole);
      setMsg(`User ${newEmail} created successfully`);
      setIsSuccess(true);
      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
      reload();
    } catch (err: any) {
      console.error(err);
      setMsg(err.message || 'Error creating user');
      setIsSuccess(false);
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1>👤 Users & Roles</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Create New User</button>
      </div>

      {msg && (
        <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>
          {msg}
        </div>
      )}

      {loading ? <div className="spinner-overlay"><div className="spinner" /></div> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Display Name / Email</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.displayName || u.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{u.uid}</td>
                    <td>
                      <span className={`role-chip ${
                        u.role === 'admin' ? 'role-admin' :
                        u.role === 'scorer' ? 'role-scorer' : 'role-viewer'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin'|'scorer'|'viewer')}
                        className="form-select" style={{ width: 'auto', padding: '4px 10px' }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="scorer">Scorer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title">Create New User</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Create a new account for a scorer or administrator.
            </p>

            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role</label>
                <select 
                  className="form-select" 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as any)}
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="scorer">Scorer (Can Update Scores)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
