'use client';
import { useEffect, useState } from 'react';
import { getTournaments, addTournament, updateTournament, deleteTournament, getTeams } from '@/lib/firestore';
import { Tournament, Team } from '@/lib/types';
import { useNotification } from '@/context/NotificationContext';

const EMPTY: Omit<Tournament, 'id' | 'createdAt'> = {
  name: '', logoUrl: '', bannerUrl: '', format: 'T20',
  startDate: '', endDate: '', venue: '',
  stages: [],
  groups: [],
  sponsors: []
};

export default function AdminTournamentsPage() {
  const { showAlert, showConfirm, showToast } = useNotification();
  const [list, setList] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Tournament, 'id' | 'createdAt'>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // form state helpers
  const [newStage, setNewStage] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorUrl, setNewSponsorUrl] = useState('');

  const reload = () => Promise.all([getTournaments(), getTeams()]).then(([t, tm]) => { 
    setList(t); 
    setTeams(tm);
    setLoading(false); 
  });
  
  useEffect(() => { reload(); }, []);

  const openCreate = () => {
    setForm(EMPTY); setEditId(null); setMsg(''); setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    const { id, createdAt, ...rest } = t as Tournament & { createdAt: unknown };
    setForm({
      ...rest,
      stages: rest.stages || [],
      groups: (rest.groups || []).map(g => ({ ...g, teamIds: g.teamIds || [] })),
      sponsors: rest.sponsors || []
    } as Omit<Tournament, 'id' | 'createdAt'>);
    setEditId(t.id); setMsg(''); setShowModal(true);
  };

  const addStage = () => {
    if (newStage.trim()) {
      setForm(f => ({ ...f, stages: [...(f.stages || []), newStage.trim()] }));
      setNewStage('');
    }
  };

  const addGroup = () => {
    if (newGroup.trim()) {
      setForm(f => ({ ...f, groups: [...(f.groups || []), { id: Date.now().toString(), name: newGroup.trim(), teamIds: [] }] }));
      setNewGroup('');
    }
  };

  const addSponsor = () => {
    if (newSponsorName.trim()) {
      setForm(f => ({ ...f, sponsors: [...(f.sponsors || []), { name: newSponsorName.trim(), logoUrl: newSponsorUrl.trim() }] }));
      setNewSponsorName(''); setNewSponsorUrl('');
    }
  };

  const handleSave = async () => {
    if (!form.name) { setMsg('Tournament name is required.'); return; }
    setSaving(true);
    try {
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
      if (editId) await updateTournament(editId, data);
      else await addTournament(data);
      setShowModal(false); setMsg('');
      await reload();
    } catch (e: any) { 
      setMsg('Error saving tournament: ' + e.message); 
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm(
      'Delete Tournament?', 
      'This will permanently delete this tournament and ALL its associated match data. This action cannot be undone.'
    );
    if (!ok) return;
    try {
      await deleteTournament(id); 
      showToast('Tournament and all related matches deleted permanently.');
      reload();
    } catch (e: any) {
      showAlert('Error', e.message, 'error');
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1>🏆 Tournaments</h1>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Tournament</button>
      </div>

      {loading ? <div className="spinner-overlay" style={{ background: 'rgba(0,0,0,0.05)' }}><div className="spinner" /></div> : (
        <>
          {list.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-text">No tournaments yet</div>
            </div>
          )}
          <div className="grid-2">
            {list.map(t => (
              <div key={t.id} className="card" style={{ overflow: 'hidden' }}>
                {t.bannerUrl ? (
                  <img src={t.bannerUrl} alt={t.name}
                    style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    height: 110,
                    background: 'linear-gradient(135deg,var(--green-dark),var(--green-main))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36
                  }}>🏆</div>
                )}
                <div className="card-padded">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {t.logoUrl
                      ? <img src={t.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--green-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
                    }
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t.format} · {t.startDate} – {t.endDate}
                      </div>
                    </div>
                  </div>
                  {t.venue && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>📍 {t.venue}</div>}
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
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editId ? 'Edit Tournament' : 'Create Tournament'}</div>
            {msg && <div className="alert alert-error">{msg}</div>}

            <div className="form-group">
              <label className="form-label">Tournament Name *</label>
              <input type="text" className="form-input" value={form.name}
                placeholder="e.g. Premier League 2025"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Format</label>
                <select className="form-select" value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value as Tournament['format'] }))}>
                  {['T20', 'ODI', 'Test', 'Softball Cricket'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input type="text" className="form-input" value={form.venue || ''}
                  placeholder="Location"
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tournament Logo URL</label>
                <input type="url" className="form-input" value={form.logoUrl || ''}
                  placeholder="https://...logo.png"
                  onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Banner URL (Optional)</label>
                <input type="url" className="form-input" value={form.bannerUrl || ''}
                  placeholder="https://...banner.jpg"
                  onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))} />
              </div>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />

            {/* Stages & Groups */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tournament Stages (Optional)</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input type="text" className="form-input" value={newStage}
                    placeholder="e.g. Quarters"
                    onChange={e => setNewStage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStage()} />
                  <button className="btn btn-primary btn-sm" onClick={addStage}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.stages?.map((st, i) => (
                    <span key={i} className="badge badge-scheduled" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {st} <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => setForm(f => ({ ...f, stages: f.stages!.filter((_, idx) => idx !== i) }))}>×</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Groups (e.g. Group A, B) *</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input type="text" className="form-input" value={newGroup}
                    placeholder="e.g. Group A"
                    onChange={e => setNewGroup(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} />
                  <button className="btn btn-primary btn-sm" onClick={addGroup}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.groups?.map((g, i) => (
                    <span key={g.id} className="badge badge-live" style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--surface2)', color: 'var(--text)' }}>
                      {g.name} <span style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => setForm(f => ({ ...f, groups: f.groups!.filter(grp => grp.id !== g.id) }))}>×</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Distribution to Groups */}
            {form.groups && form.groups.length > 0 && (
              <div className="form-group mt-16" style={{ background: 'var(--surface2)', padding: 16, borderRadius: 12 }}>
                <label className="form-label">Team Distribution (Divide teams into groups)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {form.groups.map((group, gIdx) => (
                    <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green-dark)' }}>{group.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, background: '#fff', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
                        {teams.map(team => {
                          const isSelectedInThisGroup = group.teamIds?.includes(team.id);
                          const isSelectedInOtherGroup = form.groups?.some(g => g.id !== group.id && g.teamIds?.includes(team.id));
                          
                          if (isSelectedInOtherGroup) return null; // Don't show if already in another group

                          return (
                            <label key={team.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: isSelectedInThisGroup ? 'var(--green-pale)' : 'var(--surface2)', borderRadius: 6, cursor: 'pointer' }}>
                              <input type="checkbox" checked={isSelectedInThisGroup || false} 
                                onChange={e => {
                                  const updatedGroups = [...(form.groups || [])];
                                  const g = { ...updatedGroups[gIdx] };
                                  const teamIds = [...(g.teamIds || [])];
                                  if (e.target.checked) teamIds.push(team.id);
                                  else {
                                    const idx = teamIds.indexOf(team.id);
                                    if (idx > -1) teamIds.splice(idx, 1);
                                  }
                                  g.teamIds = teamIds;
                                  updatedGroups[gIdx] = g;
                                  setForm(f => ({ ...f, groups: updatedGroups }));
                                }} 
                              />
                              {team.name} ({team.shortName})
                            </label>
                          );
                        })}
                        {(group.teamIds?.length || 0) === 0 && <span style={{ fontSize: 11, opacity: 0.5 }}>No teams assigned</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsors */}
            <div className="form-group mt-16">
              <label className="form-label">Sponsors (Optional)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" className="form-input" value={newSponsorName}
                  placeholder="Sponsor Name" style={{ flex: 1 }}
                  onChange={e => setNewSponsorName(e.target.value)} />
                <input type="url" className="form-input" value={newSponsorUrl}
                  placeholder="Logo URL" style={{ flex: 1 }}
                  onChange={e => setNewSponsorUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSponsor()} />
                <button className="btn btn-primary btn-sm" onClick={addSponsor}>Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.sponsors?.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.logoUrl && <img src={s.logoUrl} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />}
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, sponsors: f.sponsors!.filter((_, idx) => idx !== i) }))}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
