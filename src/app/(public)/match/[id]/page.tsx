'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { subscribeToMatch, subscribeToInnings, getTournament, subscribeToAllInnings } from '@/lib/firestore';
import { Match, Innings, Tournament } from '@/lib/types';
import Scorecard from '@/components/Scorecard';
import Fireworks from '@/components/Fireworks';

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch]     = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [innings, setInnings] = useState<Innings[]>([]);
  const [tab, setTab]         = useState<number>(1);
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
    const unsubInns = subscribeToAllInnings(id, (inns: Innings[]) => {
        setInnings(inns);
        // Automatically switch to latest inning if live
        const latest = inns[inns.length - 1];
        if (latest && !latest.isCompleted) setTab(latest.inningsNo);
    });
    return () => { unsubMatch(); unsubInns(); };
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

  const showInns = innings.length > 0;

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
      {match.status === 'completed' && <Fireworks />}
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
          {/* Team 1 Section */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, opacity: .8 }}>{match.team1Name}</div>
            {(() => {
              const team1Inn = innings.find(i => i.battingTeamId === match.team1Id && i.inningsNo <= 2);
              const team1SO = innings.filter(i => i.battingTeamId === match.team1Id && i.inningsNo > 2);
              if (!team1Inn) return null;
              return (
                <>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>{team1Inn.totalRuns}/{team1Inn.wickets}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>({team1Inn.overs}.{team1Inn.balls} ov)</div>
                  {team1SO.length > 0 && (
                    <div style={{ fontSize: 11, color: '#f6ad55', fontWeight: 700, marginTop: 4 }}>
                      Super Over: {team1SO.map(so => `${so.totalRuns}/${so.wickets}`).join(', ')}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          
          <div style={{ opacity: .6, fontWeight: 700 }}>VS</div>
          
          {/* Team 2 Section */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 14, opacity: .8 }}>{match.team2Name}</div>
            {(() => {
              const team2Inn = innings.find(i => i.battingTeamId === match.team2Id && i.inningsNo <= 2);
              const team2SO = innings.filter(i => i.battingTeamId === match.team2Id && i.inningsNo > 2);
              if (!team2Inn) return null;
              return (
                <>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>{team2Inn.totalRuns}/{team2Inn.wickets}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>({team2Inn.overs}.{team2Inn.balls} ov)</div>
                  {team2SO.length > 0 && (
                    <div style={{ fontSize: 11, color: '#f6ad55', fontWeight: 700, marginTop: 4 }}>
                      Super Over: {team2SO.map(so => `${so.totalRuns}/${so.wickets}`).join(', ')}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {match.tossWinner && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: .75 }}>
            🪙 Toss: {match.tossWinner === match.team1Id ? match.team1Name : match.team2Name} chose to {match.tossDecision}
          </div>
        )}
        {match.result && (
          <div style={{
            marginTop: 14, padding: '14px 18px', 
            background: match.result.includes('Tied') ? 'linear-gradient(90deg, #f6ad55, #ed8936)' : 'rgba(255,255,255,.2)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: match.result.includes('Tied') ? '#000' : '#fff' }}>
              🏁 {match.result}
            </div>
            {match.result.includes('Super Over') && (
               <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4, color: match.result.includes('Tied') ? '#2d3748' : '#e2e8f0' }}>
                 Match was decided by a Super Over after a tie in full-time.
               </div>
            )}
          </div>
        )}

        {/* Live Summary Stats */}
        {match.status === 'live' && (() => {
           const currInn = innings.find(i => i.inningsNo === match.currentInnings);
           if (!currInn) return null;
           const isSO = match.currentInnings > 2;
           const prevInn = innings.find(i => i.inningsNo === match.currentInnings - 1);
           const target = (match.currentInnings % 2 === 0 && prevInn) ? prevInn.totalRuns + 1 : null;
           const needed = target ? target - currInn.totalRuns : null;
           const ballsRem = target ? (match.overs * 6) - (currInn.overs * 6 + currInn.balls) : null;
           const rrr = (needed && ballsRem && ballsRem > 0) ? ((needed / ballsRem) * 6).toFixed(2) : '0.00';

           return (
             <div style={{ marginTop: 15, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
               {isSO && <div style={{ color: '#f6ad55', fontWeight: 800, textAlign: 'center', marginBottom: 10, fontSize: 14 }}>🔥 SUPER OVER IN PROGRESS</div>}
               <div style={{ display: 'flex', gap: 15, fontSize: 12, fontWeight: 600 }}>
                 <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: '8px 10px', borderRadius: 8 }}>
                    CRR: {currInn.runRate?.toFixed(2) || '0.00'}
                 </div>
                 {target && (
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', padding: '8px 10px', borderRadius: 8, color: '#f6ad55' }}>
                       RRR: {rrr}
                    </div>
                 )}
                 {target && (
                    <div style={{ flex: 1.5, background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 8 }}>
                       Need {needed} from {ballsRem} balls
                    </div>
                 )}
               </div>
             </div>
           );
        })()}

        <div style={{ marginTop: 12, fontSize: 11, opacity: .65, display: 'flex', justifyContent: 'space-between' }}>
          <span>📍 {match.venue} &nbsp;|&nbsp; {match.format} &nbsp;|&nbsp; {match.overs} Overs</span>
          <span>📅 {match.scheduledDate}</span>
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
      {showInns && (
        <div className="tabs" style={{ marginBottom: 15 }}>
          {innings.map(inn => {
            const isSO = inn.inningsNo > 2;
            const soNo = Math.floor((inn.inningsNo - 1) / 2); // SO 1, 2, ...
            return (
              <button key={inn.inningsNo} className={`tab${tab === inn.inningsNo ? ' active' : ''}`} onClick={() => setTab(inn.inningsNo)}>
                {isSO ? `S.O. ${soNo} (${inn.battingTeamName})` : `${inn.inningsNo === 1? '1st' : '2nd'} Innings`}
              </button>
            );
          })}
        </div>
      )}

       {innings.find(i => i.inningsNo === tab) && (
          <Scorecard 
            innings={innings.find(i => i.inningsNo === tab)!} 
            isTarget={tab % 2 === 0} 
          />
       )}

      {!showInns && match.status === 'scheduled' && (
        <div className="empty-state">
          <div className="empty-state-icon">⏰</div>
          <div className="empty-state-text">Match hasn&apos;t started yet</div>
          <div className="empty-state-sub">
            📅 {match.scheduledDate} at {match.scheduledTime} <br/>
            📍 {match.venue || 'Venue TBD'}
          </div>
        </div>
      )}
    </div>
  );
}
