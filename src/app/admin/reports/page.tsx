'use client';
import { useEffect, useState, useRef } from 'react';
import { getTournaments, getAllMatches, getInnings, getTeams } from '@/lib/firestore';
import { Tournament, Match, Innings, Team, Player } from '@/lib/types';
import { calculatePointsTable, aggregatePlayerStats, PointsTableEntry, PlayerStats } from '@/lib/reports';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ReportType = 'overview' | 'teams' | 'matches' | 'draft';

export default function AdminReportsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [inningsData, setInningsData] = useState<Record<string, Innings[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('overview');
  
  const [pointsTable, setPointsTable] = useState<PointsTableEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTournaments().then(setTournaments);
    getTeams().then(setTeams);
  }, []);

  const loadData = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const all = await getAllMatches();
    const filtered = all.filter(m => m.tournamentId === selectedTournament);
    setMatches(filtered);

    // Extract stages
    const uniqueStages = Array.from(new Set(filtered.map(m => m.stageId).filter(Boolean))) as string[];
    setStages(uniqueStages);
    setSelectedStages(uniqueStages);

    // Load innings
    const record: Record<string, Innings[]> = {};
    for (const m of filtered) {
      const i1 = await getInnings(m.id, 1);
      const i2 = await getInnings(m.id, 2);
      record[m.id] = [i1, i2].filter(Boolean) as Innings[];
    }
    setInningsData(record);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedTournament]);

  useEffect(() => {
    const activeMatches = matches.filter(m => !m.stageId || selectedStages.includes(m.stageId));
    calculatePointsTable(activeMatches, inningsData).then(setPointsTable);
    const pStats = aggregatePlayerStats(activeMatches, inningsData);
    setPlayerStats(pStats);
  }, [selectedStages, matches, inningsData]);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${reportType}_report_${selectedTournament}.pdf`);
  };

  const downloadImage = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.download = `${reportType}_report_${selectedTournament}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleStageToggle = (s: string) => {
    setSelectedStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const tName = tournaments.find(t => t.id === selectedTournament)?.name || 'Tournament';

  // Helper to find team players
  const tournamentTeams = teams.filter(t => matches.some(m => m.team1Id === t.id || m.team2Id === t.id));

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <div className="admin-topbar">
        <h1>🗒️ Admin Reporting Center</h1>
      </div>

      <div className="card card-padded mb-20">
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Select Tournament</label>
            <select className="form-select" value={selectedTournament} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Select Tournament --</option>
              {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
              <option value="overview">Tournament Overview & Points Table</option>
              <option value="teams">Detailed Team Rosters</option>
              <option value="matches">Full Match Scorecards</option>
              <option value="draft">Match Drafts (Playing XI)</option>
            </select>
          </div>
        </div>

        {reportType === 'overview' && stages.length > 0 && (
          <div className="form-group mt-16">
            <label className="form-label">Filter Stages (Points Table)</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {stages.map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedStages.includes(s)} onChange={() => handleStageToggle(s)} /> {s}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={downloadPDF} disabled={!selectedTournament}>📥 Export PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={downloadImage} disabled={!selectedTournament}>🖼️ Export Image</button>
        </div>
      </div>

      {!selectedTournament ? (
        <div className="empty-state">Select a tournament to generate reports</div>
      ) : loading ? (
        <div className="spinner-overlay"><div className="spinner" /></div>
      ) : (
        <div ref={reportRef} style={{ background: '#fff', padding: '40px 30px', borderRadius: 12, minWidth: 800 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '2px solid var(--green-main)', paddingBottom: 20 }}>
            <h2 style={{ fontSize: 28, margin: 0, color: 'var(--green-dark)' }}>{tName}</h2>
            <div style={{ fontSize: 14, color: '#666', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
              {reportType === 'overview' && 'Performance Overview & Points Table'}
              {reportType === 'teams' && 'Official Team Rosters'}
              {reportType === 'matches' && 'All Game Scorecards'}
              {reportType === 'draft' && 'Match-Day Playing XI Reports'}
            </div>
          </div>

          {/* Overview Report */}
          {reportType === 'overview' && (
            <>
              <div className="mb-32">
                <h3 className="section-heading">🏆 Points Table</h3>
                <table className="admin-table">
                  <thead>
                    <tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>T/NR</th><th>Pts</th><th>NRR</th></tr>
                  </thead>
                  <tbody>
                    {pointsTable.map(row => (
                      <tr key={row.teamId}>
                        <td style={{ fontWeight: 600 }}>{row.teamName}</td>
                        <td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td><td>{row.tied + row.noResult}</td>
                        <td style={{ fontWeight: 700 }}>{row.points}</td>
                        <td style={{ color: row.nrr >= 0 ? 'var(--green-main)' : '#e53e3e' }}>{row.nrr.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid-2 mb-32">
                <div>
                  <h3 className="section-heading">🔥 Top Batsmen</h3>
                  <table className="admin-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Player</th><th>Runs</th><th>SR</th></tr></thead>
                    <tbody>{playerStats.sort((a,b) => b.runs - a.runs).slice(0, 5).map(p => (<tr key={p.playerId}><td>{p.playerName}</td><td>{p.runs}</td><td>{p.strikeRate.toFixed(1)}</td></tr>))}</tbody>
                  </table>
                </div>
                <div>
                  <h3 className="section-heading">🎯 Top Bowlers</h3>
                  <table className="admin-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Player</th><th>Wkts</th><th>Eco</th></tr></thead>
                    <tbody>{playerStats.sort((a,b) => b.wickets - a.wickets).slice(0, 5).map(p => (<tr key={p.playerId}><td>{p.playerName}</td><td>{p.wickets}</td><td>{p.economy.toFixed(2)}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Teams Report */}
          {reportType === 'teams' && (
            <div className="grid-2">
              {tournamentTeams.map(t => (
                <div key={t.id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, borderBottom: '1px solid #eee', paddingBottom: 5, marginBottom: 10 }}>{t.name} ({t.shortName})</div>
                  {t.players.map(p => (
                    <div key={p.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{p.name} {p.isCaptain && '(C)'} {p.isViceCaptain && '(VC)'}</span>
                      <span style={{ color: '#666', fontSize: 11, textTransform: 'capitalize' }}>{p.role}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Match Scorecards Report */}
          {reportType === 'matches' && (
            <div>
              {matches.map(m => {
                const inn = inningsData[m.id] || [];
                return (
                  <div key={m.id} style={{ marginBottom: 40, border: '1px solid #eee', padding: 20, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, borderBottom: '1px dashed #ddd', paddingBottom: 10 }}>
                      <span style={{ fontWeight: 700 }}>{m.team1Name} vs {m.team2Name}</span>
                      <span style={{ fontSize: 12 }}>{m.scheduledDate} · {m.venue}</span>
                    </div>
                    {inn.length === 0 ? <div style={{ fontStyle: 'italic', fontSize: 13 }}>Match not started or data unavailable.</div> : (
                      inn.map(i => (
                        <div key={i.inningsNo} style={{ marginBottom: 15 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, background: '#f9f9f9', padding: '4px 8px' }}>
                            {i.battingTeamName} Innings: {i.totalRuns}/{i.wickets} ({i.overs}.{i.balls} ov)
                          </div>
                          <div style={{ display: 'flex', fontSize: 12, marginTop: 5, color: '#555' }}>
                            <span style={{ marginRight: 20 }}>Top Scorer: {i.batsmen.sort((a,b) => b.runs - a.runs)[0]?.playerName || '-'} ({i.batsmen.sort((a,b) => b.runs - a.runs)[0]?.runs || 0})</span>
                            <span>Best Bowler: {i.bowlers.sort((a,b) => b.wickets - a.wickets)[0]?.playerName || '-'} ({i.bowlers.sort((a,b) => b.wickets - a.wickets)[0]?.wickets || 0} wkts)</span>
                          </div>
                        </div>
                      ))
                    )}
                    <div style={{ marginTop: 10, fontWeight: 700, color: 'var(--green-main)', fontSize: 14 }}>{m.result}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Draft Report */}
          {reportType === 'draft' && (
            <div>
              {matches.map(m => (
                <div key={m.id} style={{ marginBottom: 30, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
                  <div style={{ marginBottom: 10, fontWeight: 700 }}>{m.team1Name} vs {m.team2Name} — Playing XI</div>
                  <div className="grid-2">
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-main)' }}>{m.team1Name}</div>
                      <div style={{ fontSize: 11 }}>{m.team1PlayingXI?.map(pid => tournamentTeams.find(t => t.id === m.team1Id)?.players.find(p => p.id === pid)?.name).join(', ') || 'No XI selected'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-main)' }}>{m.team2Name}</div>
                      <div style={{ fontSize: 11 }}>{m.team2PlayingXI?.map(pid => tournamentTeams.find(t => t.id === m.team2Id)?.players.find(p => p.id === pid)?.name).join(', ') || 'No XI selected'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 50, borderTop: '1px solid #eee', paddingTop: 15, fontSize: 11, color: '#aaa', textAlign: 'center' }}>
            Official Tournament Report — CricketLive Authority System — Generated {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
