'use client';
import { useEffect, useState } from 'react';
import { subscribeToMatches } from '@/lib/firestore';
import { Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToMatches((all) => {
      setMatches(all);
      setLoading(false);
    });
    return unsub;
  }, []);

  const live      = matches.filter(m => m.status === 'live');
  const upcoming  = matches.filter(m => m.status === 'scheduled');
  const completed = matches.filter(m => m.status === 'completed');

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,var(--green-dark) 0%,var(--green-main) 100%)',
        borderRadius: 'var(--radius-xl)', padding: '28px 24px', color: '#fff',
        marginBottom: 28, textAlign: 'center'
      }}>
        <div style={{ fontSize: 36 }}>🏏</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 4px' }}>
          CricketLive
        </h1>
        <p style={{ opacity: .8, fontSize: 14 }}>
          Live scores, scorecards, schedules &amp; stats — updated ball-by-ball
        </p>
        {live.length > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.15)', borderRadius: 99,
            padding: '6px 16px', marginTop: 14, fontSize: 13, fontWeight: 600
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#e53e3e',
              animation: 'pulse 1.2s infinite', display: 'inline-block'
            }} />
            {live.length} Match{live.length > 1 ? 'es' : ''} Live Now
          </div>
        )}
      </div>

      {loading && (
        <div className="spinner-overlay">
          <div className="spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading matches…</span>
        </div>
      )}

      {/* Live Matches */}
      {!loading && live.length > 0 && (
        <>
          <h2 className="section-heading">🔴 Live Now</h2>
          <div className="grid-2" style={{ marginBottom: 28 }}>
            {live.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </>
      )}

      {/* Upcoming */}
      {!loading && upcoming.length > 0 && (
        <>
          <h2 className="section-heading">🗓️ Upcoming</h2>
          <div className="grid-2" style={{ marginBottom: 28 }}>
            {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </>
      )}

      {/* Completed */}
      {!loading && completed.length > 0 && (
        <>
          <h2 className="section-heading">✅ Recent Results</h2>
          <div className="grid-2">
            {completed.slice(0, 6).map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </>
      )}

      {!loading && matches.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏏</div>
          <div className="empty-state-text">No matches yet</div>
          <div className="empty-state-sub">Check back soon for upcoming matches</div>
        </div>
      )}
    </div>
  );
}
