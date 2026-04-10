'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTournaments, getAllMatches } from '@/lib/firestore';
import { Tournament, Match } from '@/lib/types';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTournaments(), getAllMatches()]).then(([ts, ms]) => {
      setTournaments(ts);
      const counts: Record<string, number> = {};
      ms.forEach(m => { counts[m.tournamentId] = (counts[m.tournamentId] || 0) + 1; });
      setMatchCounts(counts);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div className="page-header">
        <h1>🏆 Tournaments</h1>
        <p>All cricket tournaments and competitions</p>
      </div>

      {loading && <div className="spinner-overlay"><div className="spinner" /></div>}

      {!loading && tournaments.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-text">No tournaments yet</div>
        </div>
      )}

      <div className="grid-2">
        {tournaments.map(t => (
          <div key={t.id} className="card" style={{ overflow: 'hidden' }}>
            {/* Banner */}
            {t.bannerUrl ? (
              <img src={t.bannerUrl} alt={t.name}
                style={{ width: '100%', height: 130, objectFit: 'cover' }} />
            ) : (
              <div style={{
                height: 130, background: 'linear-gradient(135deg,var(--green-dark),var(--green-main))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40
              }}>🏆</div>
            )}

            <div className="card-padded">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {t.logoUrl ? (
                  <img src={t.logoUrl} alt={t.name}
                    style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: 'var(--green-pale)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 22
                  }}>🏆</div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t.format} &nbsp;·&nbsp; {t.startDate} – {t.endDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{
                  background: 'var(--green-pale)', color: 'var(--green-dark)',
                  borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600
                }}>
                  {matchCounts[t.id] || 0} Matches
                </span>
                {t.venue && (
                  <span style={{
                    background: 'var(--surface2)', color: 'var(--text-muted)',
                    borderRadius: 99, padding: '3px 10px', fontSize: 12
                  }}>
                    📍 {t.venue}
                  </span>
                )}
              </div>

              <Link href={`/tournaments/${t.id}`} className="btn btn-ghost btn-sm w-full">
                View Tournament & Points Table →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
