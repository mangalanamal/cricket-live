'use client';
import { useEffect, useState } from 'react';
import { getAllMatches } from '@/lib/firestore';
import { Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';

type Filter = 'all' | 'scheduled' | 'live' | 'completed';

export default function SchedulePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>('all');

  useEffect(() => {
    getAllMatches().then(data => { setMatches(data); setLoading(false); });
  }, []);

  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const date = m.scheduledDate || 'Unknown Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  const filtered = filter === 'all' ? matches : matches.filter(m => m.status === filter);
  const filteredGrouped = filtered.reduce<Record<string, Match[]>>((acc, m) => {
    const date = m.scheduledDate || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  const counts = {
    all:       matches.length,
    scheduled: matches.filter(m => m.status === 'scheduled').length,
    live:      matches.filter(m => m.status === 'live').length,
    completed: matches.filter(m => m.status === 'completed').length,
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div className="page-header">
        <h1>🗓️ Match Schedule</h1>
        <p>All upcoming, live and completed matches</p>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {(['all', 'live', 'scheduled', 'completed'] as Filter[]).map(f => (
          <button key={f} className={`tab${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {' '}
            <span style={{
              background: 'var(--green-pale)', color: 'var(--green-dark)',
              borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700
            }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="spinner-overlay"><div className="spinner" /></div>}

      {!loading && Object.keys(filteredGrouped).length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🗓️</div>
          <div className="empty-state-text">No matches found</div>
        </div>
      )}

      {!loading && Object.entries(filteredGrouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayMatches]) => (
          <div key={date} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
              marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px'
            }}>
              📅 {date}
            </div>
            <div className="grid-2">
              {dayMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </div>
        ))
      }
    </div>
  );
}
