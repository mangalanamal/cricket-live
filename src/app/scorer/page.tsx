'use client';
import { useEffect, useState } from 'react';
import { getAllMatches } from '@/lib/firestore';
import { Match } from '@/lib/types';
import Link from 'next/link';

export default function ScorerDashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllMatches().then(m => {
      // Show matches that are Live, Toss, Scheduled or Break. Exclude Completed/Cancelled.
      const active = m.filter(match => !['completed', 'cancelled'].includes(match.status));
      setMatches(active);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>🏏 Select Match to Score</h1>
        <p>Choose an active or scheduled match</p>
      </div>

      {loading ? <div className="spinner-overlay"><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-text">No active matches</div>
              <div className="empty-state-sub">All matches have been completed or none scheduled.</div>
            </div>
          )}
          {matches.map(m => (
            <div key={m.id} className="card card-padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.team1Name} vs {m.team2Name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  🏆 {m.tournamentName} &nbsp;|&nbsp; 📍 {m.venue}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <span className={`badge ${
                    m.status === 'live' ? 'badge-live' :
                    m.status === 'scheduled' ? 'badge-scheduled' :
                    m.status === 'break' ? 'badge-break' : ''
                  }`}>
                    {m.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <Link href={`/scorer/match/${m.id}`} className="btn btn-primary" style={{ background: '#0284c7' }}>
                  Score Match →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
