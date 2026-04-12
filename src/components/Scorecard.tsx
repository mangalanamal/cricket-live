import { Innings } from '@/lib/types';

interface Props { innings: Innings; label?: string; isTarget?: boolean; }

export default function Scorecard({ innings, label, isTarget }: Props) {
  const batters = innings.batsmen || [];
  const bowlers = innings.bowlers || [];
  const fow    = innings.fallOfWickets || [];

  /* current batsmen */
  const [sid, nsid] = innings.currentBatsmen || [];

  function sr(runs: number, balls: number) {
    return balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
  }
  function eco(runs: number, overs: number, balls: number) {
    const total = overs + balls / 6;
    return total > 0 ? (runs / total).toFixed(2) : '0.00';
  }

  return (
    <div>
      {/* Score hero */}
      <div className="score-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="score-team-name">{innings.battingTeamName}</div>
            <div className="score-runs">
              {innings.totalRuns}/{innings.wickets}
            </div>
            <div className="score-overs">
              ({innings.overs}.{innings.balls} ov) &nbsp;|&nbsp; {innings.inningsNo <= 2 ? (innings.inningsNo === 1 ? '1st' : '2nd') : 'Super Over'}
            </div>
          </div>
          {isTarget && innings.targetRuns && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Target</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{innings.targetRuns}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Need {innings.targetRuns - innings.totalRuns} runs
              </div>
            </div>
          )}
        </div>
        <div className="score-footer">
          <div className="score-rr">
            <span>RR: <strong>{innings.runRate?.toFixed(2) ?? '0.00'}</strong></span>
            {isTarget && (
              <span>RRR: <strong>{(() => {
                const target = innings.targetRuns || 0;
                const needed = target - innings.totalRuns;
                if (needed <= 0) return '0.00';
                const totalBalls = (innings.overs + (innings.balls > 0 ? 1 : 0)) * 6; // This is tricky without match info
                // Better to just use the prop if available or keep it simple
                return innings.requiredRunRate?.toFixed(2) ?? '0.00';
              })()}</strong></span>
            )}
            <span>Extras: <strong>{innings.extras?.total ?? 0}</strong>
              &nbsp;(W:{innings.extras?.wides ?? 0} NB:{innings.extras?.noBalls ?? 0} B:{innings.extras?.byes ?? 0} LB:{innings.extras?.legByes ?? 0})
            </span>
          </div>
        </div>
      </div>

      {/* Batsmen */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 16px 0', fontWeight: 700, fontSize: 14, color: 'var(--green-dark)' }}>
          🏏 Batting
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="stats-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Batter</th>
                <th style={{ textAlign: 'center' }}>R</th>
                <th style={{ textAlign: 'center' }}>B</th>
                <th style={{ textAlign: 'center' }}>4s</th>
                <th style={{ textAlign: 'center' }}>6s</th>
                <th style={{ textAlign: 'center' }}>SR</th>
              </tr>
            </thead>
            <tbody>
              {batters.map((b, i) => {
                const isStriker  = b.playerId === sid;
                const isNonStr   = b.playerId === nsid;
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: isStriker || isNonStr ? 700 : 400 }}>
                        {b.playerName}
                        {isStriker  && <span style={{ color: 'var(--green-main)', marginLeft: 5 }}>*</span>}
                        {isNonStr   && <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>†</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {b.isOut ? b.dismissal : (isStriker || isNonStr ? 'batting' : 'not out')}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }} className={b.isOut ? 'out' : 'stats-highlight'}>{b.runs}</td>
                    <td style={{ textAlign: 'center' }}>{b.balls}</td>
                    <td style={{ textAlign: 'center' }}>{b.fours}</td>
                    <td style={{ textAlign: 'center' }}>{b.sixes}</td>
                    <td style={{ textAlign: 'center' }}>{sr(b.runs, b.balls)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bowlers */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 16px 0', fontWeight: 700, fontSize: 14, color: 'var(--green-dark)' }}>
          🎳 Bowling
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="stats-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Bowler</th>
                <th style={{ textAlign: 'center' }}>O</th>
                <th style={{ textAlign: 'center' }}>M</th>
                <th style={{ textAlign: 'center' }}>R</th>
                <th style={{ textAlign: 'center' }}>W</th>
                <th style={{ textAlign: 'center' }}>Eco</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.map((b, i) => {
                const isCurrent = b.playerId === innings.currentBowler;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: isCurrent ? 700 : 400 }}>
                      {b.playerName}{isCurrent && <span style={{ color: 'var(--green-main)', marginLeft: 5 }}>*</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{b.overs}.{b.balls}</td>
                    <td style={{ textAlign: 'center' }}>{b.maidens}</td>
                    <td style={{ textAlign: 'center' }}>{b.runs}</td>
                    <td style={{ textAlign: 'center' }} className="stats-highlight">{b.wickets}</td>
                    <td style={{ textAlign: 'center' }}>{eco(b.runs, b.overs, b.balls)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fall of Wickets */}
      {fow.length > 0 && (
        <div className="card card-padded" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-dark)', marginBottom: 10 }}>
            Fall of Wickets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fow.map((f, i) => (
              <div key={i} style={{
                background: 'var(--green-pale)', borderRadius: 'var(--radius-md)',
                padding: '5px 10px', fontSize: 12
              }}>
                <strong>{f.wicket}/{f.runs}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>({f.playerName}, {f.overs})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
