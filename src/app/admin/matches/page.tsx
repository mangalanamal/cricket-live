'use client';
import { useEffect, useState } from 'react';
import { getTeams, getTournaments, addMatch, updateMatch, deleteMatch, getAllMatches, getUsers } from '@/lib/firestore';
import { Match, Team, Tournament, UserProfile } from '@/lib/types';
import Link from 'next/link';

const EMPTY: Omit<Match, 'id' | 'createdAt'> = {
  tournamentId: '', tournamentName: '',
  team1Id: '', team1Name: '', team1ShortName: '', team1Logo: '', team1PlayingXI: [],
  team2Id: '', team2Name: '', team2ShortName: '', team2Logo: '', team2PlayingXI: [],
  venue: '', scheduledDate: '', scheduledTime: '',
  format: 'T20', overs: 20, status: 'scheduled',
  currentInnings: 1, isDraftMatch: false,
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [scorers, setScorers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Match, 'id' | 'createdAt'>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Sort and Filter state
  const [sortBy, setSortBy] = useState<'date' | 'group' | 'team'>('date');
  const [filterTournament, setFilterTournament] = useState<string>('all');

  const reload = () =>
    Promise.all([getAllMatches(), getTeams(), getTournaments(), getUsers()]).then(([m, t, to, u]) => {
      setMatches(m); setTeams(t); setTournaments(to);
      setScorers(u.filter(u => u.role === 'scorer'));
      setLoading(false);
    });

  useEffect(() => { reload(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowModal(true); setMsg(''); };
  const openEdit = (m: Match) => {
    const { id, createdAt, ...rest } = m as Match & { createdAt: unknown };
    setForm({
      ...rest,
      isDraftMatch: rest.isDraftMatch || false,
      team1PlayingXI: rest.team1PlayingXI || [],
      team2PlayingXI: rest.team2PlayingXI || []
    } as Omit<Match, 'id' | 'createdAt'>);
    setEditId(m.id); setShowModal(true); setMsg('');
  };

  const handleTeam1Change = (id: string) => {
    if (form.isDraftMatch) return;
    const t = teams.find(t => t.id === id);
    if (!t) return setForm(f => ({ ...f, team1Id: '', team1Name: '', team1ShortName: '', team1Logo: '', team1PlayingXI: [] }));
    setForm(f => ({ ...f, team1Id: t.id, team1Name: t.name, team1ShortName: t.shortName, team1Logo: t.logoUrl || '', team1PlayingXI: t.players?.map(p => p.id).slice(0, 11) || [] }));
  };

  const handleTeam2Change = (id: string) => {
    if (form.isDraftMatch) return;
    const t = teams.find(t => t.id === id);
    if (!t) return setForm(f => ({ ...f, team2Id: '', team2Name: '', team2ShortName: '', team2Logo: '', team2PlayingXI: [] }));
    setForm(f => ({ ...f, team2Id: t.id, team2Name: t.name, team2ShortName: t.shortName, team2Logo: t.logoUrl || '', team2PlayingXI: t.players?.map(p => p.id).slice(0, 11) || [] }));
  };

  const handleTournamentChange = (id: string) => {
    const t = tournaments.find(t => t.id === id);
    if (!t) return setForm(f => ({ ...f, tournamentId: '', tournamentName: '' }));
    setForm(f => ({
      ...f, tournamentId: t.id, tournamentName: t.name, format: t.format,
      overs: t.format === 'T20' ? 20 : t.format === 'ODI' ? 50 : 90,
      stageId: '', groupId: ''
    }));
  };

  const selectedTournament = tournaments.find(t => t.id === form.tournamentId);
  const team1Data = teams.find(t => t.id === form.team1Id);
  const team2Data = teams.find(t => t.id === form.team2Id);

  const handleSave = async () => {
    if (!form.tournamentId || !form.scheduledDate) {
      setMsg('Tournament and Date are required.'); return;
    }
    if (!form.isDraftMatch && (!form.team1Id || !form.team2Id)) {
      setMsg('Select both teams for a proper match.'); return;
    }
    setSaving(true);
    setMsg('');
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
      if (editId) await updateMatch(editId, data);
      else await addMatch(data);
      setShowModal(false); setMsg('');
      await reload();
    } catch (e: any) {
      setMsg('Error saving match: ' + e.message);
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    await deleteMatch(id); reload();
  };

  const statusColors: Record<string, string> = {
    scheduled: 'var(--text-muted)', live: '#e53e3e', break: '#856404',
    completed: 'var(--green-main)', cancelled: '#999', toss: '#f0a500',
  };

  // Processing matches: filter then sort
  let processedMatches = matches.filter(m => filterTournament === 'all' || m.tournamentId === filterTournament);
  
  processedMatches.sort((a, b) => {
    if (sortBy === 'group') {
      const gA = a.groupId || '';
      const gB = b.groupId || '';
      if (gA !== gB) return gA.localeCompare(gB);
    }
    if (sortBy === 'team') {
      return a.team1Name.localeCompare(b.team1Name);
    }
    // Default: Date order
    const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime || '00:00'}`);
    const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div>
      <div className="admin-topbar">
        <h1>🏏 Matches</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto' }} value={filterTournament} onChange={e => setFilterTournament(e.target.value)}>
            <option value="all">All Tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <span>Sort by:</span>
            <button className={`btn btn-sm ${sortBy === 'date' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortBy('date')}>Date</button>
            <button className={`btn btn-sm ${sortBy === 'group' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortBy('group')}>Group</button>
            <button className={`btn btn-sm ${sortBy === 'team' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortBy('team')}>Team</button>
          </div>
          
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Schedule Match</button>
        </div>
      </div>

      {loading ? <div className="spinner-overlay"><div className="spinner" /></div> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {processedMatches.map(m => (
              <div key={m.id} className="card card-padded" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>
                    {m.isDraftMatch ? `[DRAFT] ${m.team1Name} vs ${m.team2Name}` : `${m.team1ShortName} vs ${m.team2ShortName}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.tournamentName} {m.stageId ? `· ${m.stageId}` : ''} {m.groupId ? `· ${m.groupId}` : ''}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    📅 {m.scheduledDate} {m.scheduledTime} · {m.overs} Overs ({m.format})
                  </div>
                </div>

                <select value={m.status}
                  onChange={e => { updateMatch(m.id, { status: e.target.value as Match['status'] }).then(reload); }}
                  style={{
                    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                    padding: '6px 10px', fontSize: 12, fontWeight: 600,
                    color: statusColors[m.status] || 'var(--text)', background: 'var(--surface)'
                  }}>
                  {['scheduled', 'toss', 'live', 'break', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/match/${m.id}`} className="btn btn-ghost btn-sm">View</Link>
                  <Link href={`/scorer/match/${m.id}`} className="btn btn-primary btn-sm">Score</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">{editId ? 'Edit Match' : 'Schedule Match'}</div>
            {msg && <div className="alert alert-error">{msg}</div>}

            <div className="form-group">
              <label className="form-label">Tournament *</label>
              <select className="form-select" value={form.tournamentId}
                onChange={e => handleTournamentChange(e.target.value)}>
                <option value="">— Select Tournament —</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {selectedTournament && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-select" value={form.stageId || ''} onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}>
                    <option value="">None / General</option>
                    {selectedTournament.stages?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Group</label>
                  <select className="form-select" value={form.groupId || ''} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
                    <option value="">None / All Groups</option>
                    {selectedTournament.groups?.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: 'var(--surface2)', borderRadius: 8 }}>
              <input type="checkbox" id="isDraft" checked={form.isDraftMatch || false}
                onChange={e => {
                  const draft = e.target.checked;
                  setForm(f => ({ ...f, isDraftMatch: draft, team1Id: '', team2Id: '', team1Name: '', team2Name: '', team1ShortName: '', team2ShortName: '' }));
                }} />
              <label htmlFor="isDraft" style={{ fontWeight: 600, fontSize: 14 }}>Draft Match Mode (Placeholder Teams)</label>
            </div>

            {!form.isDraftMatch ? (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Team 1 *</label>
                  <select className="form-select" value={form.team1Id} onChange={e => handleTeam1Change(e.target.value)}>
                    <option value="">— Select Team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Team 2 *</label>
                  <select className="form-select" value={form.team2Id} onChange={e => handleTeam2Change(e.target.value)}>
                    <option value="">— Select Team —</option>
                    {teams.filter(t => t.id !== form.team1Id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Team 1 Placeholder *</label>
                  <input type="text" className="form-input" value={form.team1Name} placeholder="e.g. Winner of Semi 1"
                    onChange={e => setForm(f => ({ ...f, team1Name: e.target.value, team1ShortName: 'TBD' }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Team 2 Placeholder *</label>
                  <input type="text" className="form-input" value={form.team2Name} placeholder="e.g. Winner of Semi 2"
                    onChange={e => setForm(f => ({ ...f, team2Name: e.target.value, team2ShortName: 'TBD' }))} />
                </div>
              </div>
            )}

            {!form.isDraftMatch && (team1Data || team2Data) && (
              <div className="form-row" style={{ marginTop: 12, marginBottom: 16 }}>
                {team1Data && (
                  <div className="form-group" style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">Playing XI ({form.team1PlayingXI?.length || 0}/11) - {team1Data.shortName}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                      {team1Data.players?.map(p => (
                        <label key={p.id} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                          <input type="checkbox" checked={form.team1PlayingXI?.includes(p.id)}
                            onChange={e => {
                              const xi = form.team1PlayingXI || [];
                              if (e.target.checked) { if (xi.length < 11) setForm(f => ({ ...f, team1PlayingXI: [...xi, p.id] })); }
                              else setForm(f => ({ ...f, team1PlayingXI: xi.filter(id => id !== p.id) }));
                            }} /> {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {team2Data && (
                  <div className="form-group" style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">Playing XI ({form.team2PlayingXI?.length || 0}/11) - {team2Data.shortName}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                      {team2Data.players?.map(p => (
                        <label key={p.id} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                          <input type="checkbox" checked={form.team2PlayingXI?.includes(p.id)}
                            onChange={e => {
                              const xi = form.team2PlayingXI || [];
                              if (e.target.checked) { if (xi.length < 11) setForm(f => ({ ...f, team2PlayingXI: [...xi, p.id] })); }
                              else setForm(f => ({ ...f, team2PlayingXI: xi.filter(id => id !== p.id) }));
                            }} /> {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Format</label>
                <select className="form-select" value={form.format} onChange={e => setForm(f => ({...f, format: e.target.value as any}))}>
                  {['T20', 'ODI', 'Test', 'Softball Cricket'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Total Overs</label>
                <input type="number" className="form-input" value={form.overs} onChange={e => setForm(f => ({...f, overs: parseInt(e.target.value)}))}/>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
               <label className="form-label">Assign Scorer</label>
               <select className="form-select" value={form.scorerId || ''} onChange={e => setForm(f => ({ ...f, scorerId: e.target.value }))}>
                 <option value="">No Scorer assigned</option>
                 {scorers.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
               </select>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save' : 'Create Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
