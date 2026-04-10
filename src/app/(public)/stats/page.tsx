'use client';
import { useEffect, useState } from 'react';
import { getAllMatches, getInnings } from '@/lib/firestore';
import { Match, Innings, BatsmanScore, BowlerScore } from '@/lib/types';

interface BatStat extends BatsmanScore { matchId: string; team: string; opponent: string; }
interface BowlStat extends BowlerScore { matchId: string; team: string; opponent: string; }

export default function StatsPage() {
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'batting' | 'bowling' | 'summary'>('summary');
  const [batStats, setBatStats]   = useState<BatStat[]>([]);
  const [bowlStats, setBowlStats] = useState<BowlStat[]>([]);
  const [totals, setTotals]       = useState({ fours: 0, sixes: 0, wickets: 0, runs: 0, matches: 0 });

  useEffect(() => {
    async function load() {
      const matches = await getAllMatches();
      const completed = matches.filter(m => m.status === 'completed' || m.status === 'live');

      const allBat: BatStat[]  = [];
      const allBowl: BowlStat[] = [];
      let totalFours = 0, totalSixes = 0, totalWickets = 0, totalRuns = 0;

      await Promise.all(completed.map(async (m: Match) => {
        for (const inningsNo of [1, 2] as (1 | 2)[]) {
          const inn: Innings | null = await getInnings(m.id, inningsNo);
          if (!inn) continue;
          const battingTeam  = inningsNo === 1 ? m.team1Name : m.team2Name;
          const bowlingTeam  = inningsNo === 1 ? m.team2Name : m.team1Name;

          totalRuns   += inn.totalRuns;
          totalFours  += inn.batsmen?.reduce((s, b) => s + b.fours, 0) || 0;
          totalSixes  += inn.batsmen?.reduce((s, b) => s + b.sixes, 0) || 0;
          totalWickets += inn.wickets;

          inn.batsmen?.forEach(b => allBat.push({ ...b, matchId: m.id, team: battingTeam, opponent: bowlingTeam }));
          inn.bowlers?.forEach(b => allBowl.push({ ...b, matchId: m.id, team: bowlingTeam, opponent: battingTeam }));
        }
      }));

      setBatStats(allBat.sort((a, b) => b.runs - a.runs));
      setBowlStats(allBowl.filter(b => b.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs));
      setTotals({ fours: totalFours, sixes: totalSixes, wickets: totalWickets, runs: totalRuns, matches: completed.length });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="spinner-overlay"><div className="spinner" /></div>
    </div>
  );

  function sr(runs: number, balls: number) {
    return balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
  }
  function eco(runs: number, overs: number, balls: number) {
    const t = overs + balls / 6;
    return t > 0 ? (runs / t).toFixed(2) : '0.00';
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div className="page-header">
        <h1>📊 Statistics</h1>
        <p>Player performance, boundaries, and tournament totals</p>
      </div>

      {/* Summary boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Matches Played', value: totals.matches, icon: '🏏' },
          { label: 'Total Runs',     value: totals.runs.toLocaleString(), icon: '🏃' },
          { label: 'Total 4s',       value: totals.fours, icon: '🟡' },
          { label: 'Total 6s',       value: totals.sixes, icon: '🔴' },
          { label: 'Total Wickets',  value: totals.wickets, icon: '🎯' },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div className="stat-box-value">{s.value}</div>
            <div className="stat-box-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab === 'summary'  ? ' active' : ''}`} onClick={() => setTab('summary')}>Best Performances</button>
        <button className={`tab${tab === 'batting'  ? ' active' : ''}`} onClick={() => setTab('batting')}>Batting</button>
        <button className={`tab${tab === 'bowling'  ? ' active' : ''}`} onClick={() => setTab('bowling')}>Bowling</button>
      </div>

      {/* Best Performances */}
      {tab === 'summary' && (
        <div className="grid-2">
          {/* Top 5 batters */}
          <div className="card">
            <div style={{ padding: '14px 16px 0', fontWeight: 700, fontSize: 14, color: 'var(--green-dark)' }}>
              🏆 Top Batters
            </div>
            <table className="stats-table" style={{ marginTop: 8 }}>
              <thead>
                <tr><th>#</th><th>Player</th><th>Runs</th><th>4s</th><th>6s</th></tr>
              </thead>
              <tbody>
                {batStats.slice(0, 8).map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.playerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs {b.opponent}</div>
                    </td>
                    <td className="stats-highlight">{b.runs}</td>
                    <td>{b.fours}</td>
                    <td>{b.sixes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top bowlers */}
          <div className="card">
            <div style={{ padding: '14px 16px 0', fontWeight: 700, fontSize: 14, color: 'var(--green-dark)' }}>
              🎯 Top Bowlers
            </div>
            <table className="stats-table" style={{ marginTop: 8 }}>
              <thead>
                <tr><th>#</th><th>Player</th><th>W</th><th>R</th><th>Eco</th></tr>
              </thead>
              <tbody>
                {bowlStats.slice(0, 8).map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.playerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs {b.opponent}</div>
                    </td>
                    <td className="stats-highlight">{b.wickets}</td>
                    <td>{b.runs}</td>
                    <td>{eco(b.runs, b.overs, b.balls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batting stats */}
      {tab === 'batting' && (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>#</th><th>Player</th><th>Team</th><th>R</th>
                  <th>B</th><th>4s</th><th>6s</th><th>SR</th>
                </tr>
              </thead>
              <tbody>
                {batStats.map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.playerName}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.team}</td>
                    <td className="stats-highlight">{b.runs}</td>
                    <td>{b.balls}</td>
                    <td>{b.fours}</td>
                    <td>{b.sixes}</td>
                    <td>{sr(b.runs, b.balls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bowling stats */}
      {tab === 'bowling' && (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>#</th><th>Player</th><th>Team</th><th>O</th>
                  <th>R</th><th>W</th><th>Eco</th>
                </tr>
              </thead>
              <tbody>
                {bowlStats.map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{b.playerName}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.team}</td>
                    <td>{b.overs}.{b.balls}</td>
                    <td>{b.runs}</td>
                    <td className="stats-highlight">{b.wickets}</td>
                    <td>{eco(b.runs, b.overs, b.balls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
