'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTournament, getAllMatches, getInnings, getTeams } from '@/lib/firestore';
import { Tournament, Match, Team, Player } from '@/lib/types';

interface TeamStats {
  id: string; name: string; groupId?: string;
  p: number; w: number; l: number; t: number; pts: number;
  rs: number; of: number; rc: number; ob: number; nrr: number;
}

interface PlayerStats {
  id: string; name: string; teamName: string; role: Player['role'];
  runs: number; balls: number; wickets: number; runsConceded: number; oversBowled: number;
}

export default function TournamentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [pointsTable, setPointsTable] = useState<Record<string, TeamStats[]>>({});
  const [bestXI, setBestXI] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const t = await getTournament(id);
      setTournament(t);
      if (!t) { setLoading(false); return; }

      const allM = await getAllMatches();
      const tourneyMatches = allM.filter(m => m.tournamentId === id);
      const completed = tourneyMatches.filter(m => m.status === 'completed');

      const allTeams = await getTeams();
      const playerRoles: Record<string, { role: Player['role'], teamName: string, name: string }> = {};
      allTeams.forEach(tm => {
        tm.players?.forEach(p => {
          playerRoles[p.id] = { role: p.role || 'batsman', teamName: tm.shortName, name: p.name };
        });
      });

      const statsMap: Record<string, TeamStats> = {};
      const pStats: Record<string, PlayerStats> = {};

      for (const m of completed) {
        if (!m.team1Id || !m.team2Id) continue;
        
        if (!statsMap[m.team1Id]) statsMap[m.team1Id] = { id: m.team1Id, name: m.team1Name, groupId: m.groupId, p: 0, w: 0, l: 0, t: 0, pts: 0, rs: 0, of: 0, rc: 0, ob: 0, nrr: 0 };
        if (!statsMap[m.team2Id]) statsMap[m.team2Id] = { id: m.team2Id, name: m.team2Name, groupId: m.groupId, p: 0, w: 0, l: 0, t: 0, pts: 0, rs: 0, of: 0, rc: 0, ob: 0, nrr: 0 };

        statsMap[m.team1Id].p++; statsMap[m.team2Id].p++;

        const inn1 = await getInnings(m.id, 1);
        const inn2 = await getInnings(m.id, 2);
        
        let t1Wins = false, t2Wins = false, isTie = false;
        
        if (inn1 && inn2) {
          if (inn1.totalRuns > inn2.totalRuns) {
            if (inn1.battingTeamId === m.team1Id) t1Wins = true; else t2Wins = true;
          } else if (inn2.totalRuns > inn1.totalRuns) {
            if (inn2.battingTeamId === m.team1Id) t1Wins = true; else t2Wins = true;
          } else { isTie = true; }

          const parseOvers = (o: number, b: number) => o + b / 6;

          const addNrrStats = (teamId: string, rs: number, ofaced: number, wlost: number, rc: number, obowled: number, wtaken: number) => {
            const effectiveOF = wlost === 10 ? m.overs : ofaced;
            const effectiveOB = wtaken === 10 ? m.overs : obowled;
            statsMap[teamId].rs += rs; statsMap[teamId].of += effectiveOF;
            statsMap[teamId].rc += rc; statsMap[teamId].ob += effectiveOB;
          };

          if (inn1.battingTeamId === m.team1Id) {
            addNrrStats(m.team1Id, inn1.totalRuns, parseOvers(inn1.overs, inn1.balls), inn1.wickets, inn2.totalRuns, parseOvers(inn2.overs, inn2.balls), inn2.wickets);
            addNrrStats(m.team2Id, inn2.totalRuns, parseOvers(inn2.overs, inn2.balls), inn2.wickets, inn1.totalRuns, parseOvers(inn1.overs, inn1.balls), inn1.wickets);
          } else {
            addNrrStats(m.team2Id, inn1.totalRuns, parseOvers(inn1.overs, inn1.balls), inn1.wickets, inn2.totalRuns, parseOvers(inn2.overs, inn2.balls), inn2.wickets);
            addNrrStats(m.team1Id, inn2.totalRuns, parseOvers(inn2.overs, inn2.balls), inn2.wickets, inn1.totalRuns, parseOvers(inn1.overs, inn1.balls), inn1.wickets);
          }

          // Player Stats Extractor
          [inn1, inn2].forEach(inn => {
            inn.batsmen.forEach(b => {
              if (!pStats[b.playerId]) pStats[b.playerId] = { id: b.playerId, name: b.playerName, teamName: playerRoles[b.playerId]?.teamName || 'UNK', role: playerRoles[b.playerId]?.role || 'batsman', runs: 0, balls: 0, wickets: 0, runsConceded: 0, oversBowled: 0 };
              pStats[b.playerId].runs += (b.runs || 0);
              pStats[b.playerId].balls += (b.balls || 0);
            });
            inn.bowlers.forEach(b => {
              if (!pStats[b.playerId]) pStats[b.playerId] = { id: b.playerId, name: b.playerName, teamName: playerRoles[b.playerId]?.teamName || 'UNK', role: playerRoles[b.playerId]?.role || 'bowler', runs: 0, balls: 0, wickets: 0, runsConceded: 0, oversBowled: 0 };
              pStats[b.playerId].wickets += (b.wickets || 0);
              pStats[b.playerId].runsConceded += (b.runs || 0);
              pStats[b.playerId].oversBowled += (b.overs || 0) + (b.balls || 0)/6;
            });
          });

        } else {
          // fallback
          if (m.result?.toLowerCase().includes(m.team1Name.toLowerCase())) t1Wins = true;
          else if (m.result?.toLowerCase().includes(m.team2Name.toLowerCase())) t2Wins = true;
          else isTie = true;
        }

        if (t1Wins) { statsMap[m.team1Id].w++; statsMap[m.team1Id].pts += 2; statsMap[m.team2Id].l++; }
        else if (t2Wins) { statsMap[m.team2Id].w++; statsMap[m.team2Id].pts += 2; statsMap[m.team1Id].l++; }
        else if (isTie) { statsMap[m.team1Id].t++; statsMap[m.team2Id].t++; statsMap[m.team1Id].pts += 1; statsMap[m.team2Id].pts += 1; }
      }

      const groupsDict: Record<string, TeamStats[]> = {};
      Object.values(statsMap).forEach(st => {
        st.nrr = st.of > 0 ? (st.rs/st.of) - (st.ob>0 ? st.rc/st.ob : 0) : 0;
        const gName = st.groupId || 'Main Group';
        if (!groupsDict[gName]) groupsDict[gName] = [];
        groupsDict[gName].push(st);
      });

      Object.keys(groupsDict).forEach(k => {
        groupsDict[k].sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);
      });

      // Best XI Selection Engine
      const allPlayers = Object.values(pStats);
      const wk = allPlayers.filter(p => p.role === 'wicketkeeper').sort((a, b) => b.runs - a.runs)[0];
      
      const batsmen = allPlayers.filter(p => (p.role === 'batsman' || p.role === 'allrounder') && p.id !== wk?.id)
        .sort((a, b) => b.runs - a.runs).slice(0, 5);
        
      const allrounders = allPlayers.filter(p => p.role === 'allrounder' && p.id !== wk?.id && !batsmen.find(b=>b.id===p.id))
        .sort((a, b) => (b.runs + b.wickets*20) - (a.runs + a.wickets*20)).slice(0, 1);
        
      const bowlers = allPlayers.filter(p => p.role === 'bowler' && p.id !== wk?.id)
        .sort((a, b) => b.wickets - a.wickets || (a.runsConceded/a.oversBowled) - (b.runsConceded/b.oversBowled)).slice(0, 4);

      const teamXI = [wk, ...batsmen, ...allrounders, ...bowlers].filter(Boolean) as PlayerStats[];
      // sort by role for display
      const roleOrder: Record<string, number> = { 'batsman': 1, 'wicketkeeper': 2, 'allrounder': 3, 'bowler': 4, 'none': 5 };
      teamXI.sort((a, b) => (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9));

      setBestXI(teamXI);
      setPointsTable(groupsDict);
      setLoading(false);
    };

    fetchAll();
  }, [id]);

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;
  if (!tournament) return <div className="container" style={{ paddingTop: 40 }}><div className="empty-state">Tournament not found</div></div>;

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      {/* Tournament Header */}
      <div style={{
        padding: 24, background: 'linear-gradient(135deg,var(--green-dark),var(--green-main))',
        borderRadius: 'var(--radius-xl)', color: '#fff', marginBottom: 24
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {tournament.logoUrl && <img src={tournament.logoUrl} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }} alt="" />}
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>{tournament.name}</h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>📍 {tournament.venue} &nbsp;|&nbsp; {tournament.format} &nbsp;|&nbsp; {tournament.startDate} to {tournament.endDate}</p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Points Table */}
        <div className="card card-padded" style={{ alignSelf: 'flex-start' }}>
          <h2 style={{ marginBottom: 16 }}>📊 Points Table & NRR</h2>
          {Object.keys(pointsTable).length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No match data available to generate table.</p>
          ) : (
            Object.entries(pointsTable).map(([group, teams]) => (
              <div key={group} style={{ marginBottom: 24 }}>
                {group !== 'Main Group' && <h3 style={{ marginBottom: 12, color: 'var(--green-main)', fontSize: 16 }}>{group}</h3>}
                <div style={{ overflowX: 'auto' }}>
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Team</th>
                        <th>P</th><th>W</th><th>L</th><th>T</th>
                        <th>PTS</th><th>NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t, idx) => (
                        <tr key={t.id}>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>{idx + 1}. {t.name}</td>
                          <td>{t.p}</td>
                          <td>{t.w}</td>
                          <td>{t.l}</td>
                          <td>{t.t}</td>
                          <td style={{ fontWeight: 800, color: 'var(--green-main)' }}>{t.pts}</td>
                          <td style={{ fontWeight: 600, color: t.nrr >= 0 ? '#10b981' : '#ef4444' }}>
                            {t.nrr > 0 ? '+' : ''}{t.nrr.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Team of the Tournament */}
        <div className="card card-padded" style={{ alignSelf: 'flex-start' }}>
          <h2 style={{ marginBottom: 16 }}>🌟 Team of the Tournament</h2>
          {bestXI.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Not enough data to calculate best XI.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -10 }}>Auto-generated standard XI based on tournament stats (1 WK, 5 BAT, 1 ALL, 4 BOWL)</p>
              {bestXI.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 24, fontWeight: 700, color: 'var(--text-muted)' }}>{i+1}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {p.teamName} · {p.role === 'wicketkeeper' ? 'WK' : p.role}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                    {['batsman', 'wicketkeeper'].includes(p.role) && <span style={{ color: 'var(--green-main)' }}>{p.runs} Runs</span>}
                    {p.role === 'bowler' && <span style={{ color: '#0284c7' }}>{p.wickets} Wkts</span>}
                    {p.role === 'allrounder' && <span>{p.runs}R / {p.wickets}W</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
