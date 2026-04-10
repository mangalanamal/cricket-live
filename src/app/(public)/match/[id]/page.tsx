'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { subscribeToMatch, subscribeToInnings, getTournament } from '@/lib/firestore';
import { Match, Innings, Tournament } from '@/lib/types';
import Scorecard from '@/components/Scorecard';

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch]     = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [inn1, setInn1]       = useState<Innings | null>(null);
  const [inn2, setInn2]       = useState<Innings | null>(null);
  const [tab, setTab]         = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubMatch = subscribeToMatch(id, async (m) => {
      setMatch(m);
      if (m?.tournamentId) {
        const t = await getTournament(m.tournamentId);
        setTournament(t);
      }
      setLoading(false);
    });
    const unsubInn1 = subscribeToInnings(id, 1, setInn1);
    const unsubInn2 = subscribeToInnings(id, 2, setInn2);
    return () => { unsubMatch(); unsubInn1(); unsubInn2(); };
  }, [id]);

  if (loading) return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="spinner-overlay"><div className="spinner" /></div>
    </div>
  );
  if (!match) return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="empty-state"><div className="empty-state-text">Match not found</div></div>
    </div>
  );

  const showInn1 = !!inn1;
  const showInn2 = match.currentInnings === 2 || match.status === 'completed';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${match.team1ShortName} vs ${match.team2ShortName} - Live Cricket Score`,
        text: `Follow the live score of ${match.team1Name} vs ${match.team2Name} at ${match.tournamentName}!`,
        url: window.location.href,
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Match link copied to clipboard!');
    }
  };

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Match header */}
      <div style={{
        background: 'linear-gradient(135deg,var(--green-dark) 0%,var(--green-main) 100%)',
        borderRadius: 'var(--radius-xl)', padding: '20px', color: '#fff', marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, opacity: .7 }}>🏆 {match.tournamentName}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleShare} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
              📤 Share
            </button>
            <span className={`badge ${
              match.status === 'live' ? 'badge-live' :
              match.status === 'completed' ? 'badge-completed' :
              match.status === 'break' ? 'badge-break' : 'badge-scheduled'
            }`}>
              {match.status === 'live' ? 'Live' : match.status === 'completed' ? 'Completed' :
               match.status === 'break' ? 'Break' : 'Scheduled'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, opacity: .8 }}>{match.team1Name}</div>
            {inn1 && match.currentInnings === 1 && (
              <div style={{ fontSize: 32, fontWeight: 800 }}>{inn1.totalRuns}/{inn1.wickets}</div>
            )}
            {inn1 && match.currentInnings === 1 && (
              <div style={{ fontSize: 12, opacity: .7 }}>({inn1.overs}.{inn1.balls} ov)</div>
            )}
          </div>
          <div style={{ opacity: .6, fontWeight: 700 }}>VS</div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 14, opacity: .8 }}>{match.team2Name}</div>
            {inn2 && (
              <div style={{ fontSize: 32, fontWeight: 800 }}>{inn2.totalRuns}/{inn2.wickets}</div>
            )}
            {inn2 && (
              <div style={{ fontSize: 12, opacity: .7 }}>({inn2.overs}.{inn2.balls} ov)</div>
            )}
          </div>
        </div>

        {match.tossWinner && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: .75 }}>
            🪙 Toss: {match.tossWinner} chose to {match.tossDecision}
          </div>
        )}
        {match.result && (
          <div style={{
            marginTop: 10, padding: '8px 14px', background: 'rgba(255,255,255,.15)',
            borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600
          }}>
            🏆 {match.result}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 12, opacity: .65 }}>
          📍 {match.venue} &nbsp;|&nbsp; {match.format} &nbsp;|&nbsp; {match.overs} Overs
        </div>
        <div style={{ marginTop: 2, fontSize: 12, opacity: .65 }}>
          📅 {match.scheduledDate} at {match.scheduledTime}
        </div>
      </div>

      {/* Sponsors Bar */}
      {tournament?.sponsors && tournament.sponsors.length > 0 && (
        <div style={{ 
          display: 'flex', gap: 16, overflowX: 'auto', padding: '12px 20px', 
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)', marginBottom: 20,
          alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginRight: 8, whiteSpace: 'nowrap' }}>Brought to you by:</span>
          {tournament.sponsors.map((s, idx) => (
            <a key={idx} href={s.url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
              {s.logoUrl ? (
                <img src={s.logoUrl} alt={s.name} style={{ height: 36, objectFit: 'contain' }} title={s.name} />
              ) : (
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Innings Tabs */}
      {(showInn1 || showInn2) && (
        <div className="tabs">
          {showInn1 && (
            <button className={`tab${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)}>
              1st Innings — {match.team1Name}
            </button>
          )}
          {showInn2 && (
            <button className={`tab${tab === 2 ? ' active' : ''}`} onClick={() => setTab(2)}>
              2nd Innings — {match.team2Name}
            </button>
          )}
        </div>
      )}

      {tab === 1 && inn1 && <Scorecard innings={inn1} />}
      {tab === 2 && inn2 && <Scorecard innings={inn2} isTarget />}

      {!showInn1 && match.status === 'scheduled' && (
        <div className="empty-state">
          <div className="empty-state-icon">⏰</div>
          <div className="empty-state-text">Match hasn&apos;t started yet</div>
          <div className="empty-state-sub">{match.scheduledDate} at {match.scheduledTime}</div>
        </div>
      )}
    </div>
  );
}
