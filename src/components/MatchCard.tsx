import Link from 'next/link';
import { Match } from '@/lib/types';
interface Props { match: Match; }

function TeamLogo({ url, name }: { url?: string; name: string }) {
  if (url) return <img src={url} alt={name} className="match-team-logo" />;
  return (
    <div className="match-team-logo-placeholder">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function MatchCard({ match }: Props) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  return (
    <Link href={`/match/${match.id}`} style={{ display: 'block' }}>
      <div className="match-card">
        <div className="match-card-header">
          <span className="match-card-tournament">
            🏆 {match.tournamentName}
          </span>
          <span className={`badge ${
            isLive ? 'badge-live' :
            isCompleted ? 'badge-completed' :
            match.status === 'break' ? 'badge-break' :
            'badge-scheduled'
          }`}>
            {isLive ? 'Live' : isCompleted ? 'Completed' :
             match.status === 'break' ? 'Break' : 'Scheduled'}
          </span>
        </div>

        <div className="match-card-body">
          <div className="match-teams">
            <div className="match-team">
              <TeamLogo url={match.team1Logo} name={match.team1ShortName} />
              <div className="match-team-name">{match.team1ShortName}</div>
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              {(isLive || isCompleted) ? (
                <div>
                   <div className="match-vs" style={{ marginBottom: 4 }}>VS</div>
                   {match.score1 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>{match.score1}</div>}
                   {match.score2 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>{match.score2}</div>}
                </div>
              ) : (
                <div>
                  <div className="match-vs">VS</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {match.scheduledDate} {match.scheduledTime}
                  </div>
                </div>
              )}
            </div>

            <div className="match-team" style={{ alignItems: 'flex-end' }}>
              <TeamLogo url={match.team2Logo} name={match.team2ShortName} />
              <div className="match-team-name">{match.team2ShortName}</div>
            </div>
          </div>

          {match.result && (
            <div style={{
              marginTop: 12, padding: '8px 12px', background: 'var(--green-pale)',
              borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
              color: 'var(--green-dark)', textAlign: 'center'
            }}>
              {match.result}
            </div>
          )}
        </div>

        <div className="match-card-footer">
          <span>📍 {match.venue || 'N/A'}</span>
          <span style={{ color: 'var(--green-main)', fontWeight: 600 }}>
            {match.format} • {match.overs} Overs →
          </span>
        </div>
      </div>
    </Link>
  );
}
