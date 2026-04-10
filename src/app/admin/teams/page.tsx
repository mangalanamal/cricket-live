'use client';
import { useEffect, useState } from 'react';
import { getTeams, addTeam, updateTeam, deleteTeam } from '@/lib/firestore';
import { Team, Player } from '@/lib/types';

const EMPTY_TEAM: Omit<Team, 'id' | 'createdAt'> = {
  name: '', shortName: '', logoUrl: '', players: [],
};

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random&name=';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Team, 'id' | 'createdAt'>>(EMPTY_TEAM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('');

  const reload = () => getTeams().then(t => { setTeams(t); setLoading(false); });
  useEffect(() => { reload(); }, []);

  const openCreate = () => {
    setForm(EMPTY_TEAM); setEditId(null);
    setShowModal(true); setMsg('');
    setNewPlayerName(''); setNewPlayerAvatar('');
  };

  const openEdit = (t: Team) => {
    const { id, createdAt, ...rest } = t as Team & { createdAt: unknown };
    setForm({ ...rest as Omit<Team, 'id' | 'createdAt'>, players: [...(t.players || [])] });
    setEditId(t.id); setShowModal(true); setMsg('');
    setNewPlayerName(''); setNewPlayerAvatar('');
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const p: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      role: 'none',
      avatarUrl: newPlayerAvatar.trim() || '',
      isCaptain: false,
      isViceCaptain: false
    };
    setForm(f => ({ ...f, players: [...f.players, p] }));
    setNewPlayerName('');
    setNewPlayerAvatar('');
  };

  const removePlayer = (id: string) =>
    setForm(f => ({ ...f, players: f.players.filter(p => p.id !== id) }));

  const updatePlayerRole = (id: string, role: Player['role']) =>
    setForm(f => ({ ...f, players: f.players.map(p => p.id === id ? { ...p, role } : p) }));

  const updatePlayerAvatar = (id: string, avatarUrl: string) =>
    setForm(f => ({ ...f, players: f.players.map(p => p.id === id ? { ...p, avatarUrl: avatarUrl || '' } : p) }));

  const handleSave = async () => {
    if (!form.name || !form.shortName) { setMsg('Name and short name required.'); return; }
    setSaving(true);
    setMsg('');
    try {
      // Deep clean to remove any 'undefined' values which Firestore hates
      const clean = (obj: any): any => {
        const result = { ...obj };
        Object.keys(result).forEach(key => {
          if (result[key] === undefined) delete result[key];
          else if (Array.isArray(result[key])) {
            result[key] = result[key].map((v: any) => (v && typeof v === 'object') ? clean(v) : v);
          } else if (result[key] && typeof result[key] === 'object') {
            result[key] = clean(result[key]);
          }
        });
        return result;
      };

      const data = clean(form);
      if (editId) await updateTeam(editId, data);
      else await addTeam(data);
      setShowModal(false); setMsg('');
      await reload();
    } catch (e: any) { 
      setMsg('Error saving team: ' + e.message); 
      console.error(e); 
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    await deleteTeam(id); reload();
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1>👥 Teams</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Team</button>
      </div>

      {loading ? <div className="spinner-overlay"><div className="spinner" /></div> : (
        <>
          {teams.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">No teams added yet</div>
            </div>
          )}
          <div className="grid-3">
            {teams.map(t => (
              <div key={t.id} className="card">
                <div style={{
                  height: 80, background: 'linear-gradient(135deg,var(--green-dark),var(--green-main))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.name} style={{
                      width: 60, height: 60, borderRadius: '50%',
                      objectFit: 'cover', border: '3px solid #fff'
                    }} />
                  ) : (
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'rgba(255,255,255,.2)', border: '3px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 800, color: '#fff'
                    }}>{t.shortName.slice(0, 2)}</div>
                  )}
                </div>
                <div className="card-padded">
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {t.shortName} · {t.players?.length || 0} players
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 660 }}>
            <div className="modal-title">{editId ? 'Edit Team' : 'Add New Team'}</div>
            {msg && <div className="alert alert-error">{msg}</div>}

            <div className="form-group">
              <label className="form-label">Team Logo URL</label>
              <input type="url" className="form-input" value={form.logoUrl || ''}
                placeholder="https://example.com/team-logo.png"
                onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
              {form.logoUrl && (
                <div style={{ marginTop: 8 }}>
                  <img src={form.logoUrl} alt="Logo Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%' }} />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input type="text" className="form-input" value={form.name || ''}
                  placeholder="e.g. Sri Lanka Lions"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Short Name *</label>
                <input type="text" className="form-input" value={form.shortName || ''}
                  placeholder="e.g. SLL" maxLength={5}
                  onChange={e => setForm(f => ({ ...f, shortName: e.target.value.toUpperCase() }))} />
              </div>
            </div>

            {/* Players */}
            <div className="form-group">
              <label className="form-label">Players</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" className="form-input" value={newPlayerName}
                  placeholder="Player name *" style={{ flex: 1 }}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPlayer()} />
                <input type="url" className="form-input" value={newPlayerAvatar}
                  placeholder="Avatar URL (optional)" style={{ flex: 1 }}
                  onChange={e => setNewPlayerAvatar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPlayer()} />
                <button className="btn btn-primary btn-sm" onClick={addPlayer}>Add</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto' }}>
                {form.players.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '6px 10px'
                  }}>
                    <img
                      src={p.avatarUrl || `${DEFAULT_AVATAR}${encodeURIComponent(p.name)}`}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: 100 }}>{p.name}</span>

                    <input
                      type="url"
                      className="form-input"
                      value={p.avatarUrl || ''}
                      placeholder="Avatar URL..."
                      onChange={e => updatePlayerAvatar(p.id, e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', fontSize: 11 }}
                    />

                    <select value={p.role || 'none'} onChange={e => updatePlayerRole(p.id, e.target.value as Player['role'])}
                      style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
                      <option value="none">N/A</option>
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                      <option value="allrounder">All</option>
                      <option value="wicketkeeper">WK</option>
                    </select>

                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input type="checkbox" checked={p.isCaptain || false}
                        onChange={e => setForm(f => ({ ...f, players: f.players.map(pl => pl.id === p.id ? { ...pl, isCaptain: e.target.checked } : pl) }))} /> C
                    </label>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input type="checkbox" checked={p.isViceCaptain || false}
                        onChange={e => setForm(f => ({ ...f, players: f.players.map(pl => pl.id === p.id ? { ...pl, isViceCaptain: e.target.checked } : pl) }))} /> VC
                    </label>

                    <button onClick={() => removePlayer(p.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 18, padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
