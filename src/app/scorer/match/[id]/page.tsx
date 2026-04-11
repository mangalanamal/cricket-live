'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMatch, getInnings, setInnings, updateInnings, updateMatch, getTeam } from '@/lib/firestore';
import { Match, Innings, Team, Player, BatsmanScore, BowlerScore } from '@/lib/types';
import { useNotification } from '@/context/NotificationContext';

export default function ProfessionalScoringPanel() {
  const { showAlert, showConfirm, showToast } = useNotification();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [inning, setInning] = useState<Innings | null>(null);
  const [firstInning, setFirstInning] = useState<Innings | null>(null);
  const [loading, setLoading] = useState(true);
  const [t1, setT1] = useState<Team | null>(null);
  const [t2, setT2] = useState<Team | null>(null);

  // Configuration
  const [widePenalty, setWidePenalty] = useState(1);
  const [noBallPenalty, setNoBallPenalty] = useState(1);

  // Toss/Init State
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'field'>('bat');
  const [batTeamId, setBatTeamId] = useState('');
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Modal states
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [outBatsmanId, setOutBatsmanId] = useState('');
  const [dismissalType, setDismissalType] = useState('caught');
  const [newBatsmanId, setNewBatsmanId] = useState('');

  const loadData = async () => {
    setLoading(true);
    const m = await getMatch(id);
    if (!m) return;
    setMatch(m);
    
    const [team1, team2] = await Promise.all([getTeam(m.team1Id), getTeam(m.team2Id)]);
    setT1(team1); setT2(team2);

    if (m.tossWinner) {
      setTossWinner(m.tossWinner);
      setTossDecision(m.tossDecision || 'bat');
      const firstBattingId = (m.tossDecision === 'bat') ? m.tossWinner : (m.tossWinner === m.team1Id ? m.team2Id : m.team1Id);
      
      if (m.currentInnings === 1) {
        setBatTeamId(firstBattingId || '');
      } else {
        const secondBattingId = (firstBattingId === m.team1Id) ? m.team2Id : m.team1Id;
        setBatTeamId(secondBattingId || '');
      }
    }

    const inn = await getInnings(id, m.currentInnings);
    setInning(inn);

    if (m.currentInnings === 2) {
      const inn1 = await getInnings(id, 1);
      setFirstInning(inn1);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const [tossSelection, setTossSelection] = useState<'' | '1' | '2'>('');

  const handleToss = async () => {
    if (!tossSelection || !tossDecision) return showAlert('Action Required', 'Please select toss winner and decision.', 'warning');
    
    const winningId = tossSelection === '1' ? match?.team1Id : match?.team2Id;
    const battingId = tossDecision === 'bat' ? winningId : (tossSelection === '1' ? match?.team2Id : match?.team1Id);
    
    setTossWinner(winningId || 'TBD');
    setBatTeamId(battingId || 'TBD');

    await updateMatch(id, { 
      tossWinner: winningId || 'TBD', 
      tossDecision, 
      status: 'toss' 
    });
    
    setMatch(prev => prev ? { ...prev, tossWinner: winningId || 'TBD', tossDecision, status: 'toss' } : null);
  };

  const initInning = async () => {
    if (!match || !batTeamId || !strikerId || !nonStrikerId || !bowlerId) return showAlert('Missing Selection', 'Select both batsmen and an opening bowler to begin.', 'warning');
    
    const batTeam = batTeamId === match.team1Id ? t1 : t2;
    const bowlTeam = batTeamId === match.team1Id ? t2 : t1;
    if (!batTeam || !bowlTeam) return;

    const strk = batTeam.players.find(p => p.id === strikerId);
    const nstrk = batTeam.players.find(p => p.id === nonStrikerId);
    const bowl = bowlTeam.players.find(p => p.id === bowlerId);
    if (!strk || !nstrk || !bowl) return;

    const newInning: Innings = {
      inningsNo: match.currentInnings,
      battingTeamId: batTeam.id, battingTeamName: batTeam.name,
      bowlingTeamId: bowlTeam.id, bowlingTeamName: bowlTeam.name,
      totalRuns: 0, wickets: 0, overs: 0, balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      runRate: 0,
      ...(match.currentInnings === 2 && firstInning ? { targetRuns: firstInning.totalRuns + 1 } : {}),
      batsmen: [
        { playerId: strk.id, playerName: strk.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0 },
        { playerId: nstrk.id, playerName: nstrk.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0 }
      ],
      bowlers: [
        { playerId: bowl.id, playerName: bowl.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }
      ],
      fallOfWickets: [],
      currentBatsmen: [strk.id, nstrk.id],
      currentBowler: bowl.id,
      isCompleted: false
    };

    await updateMatch(id, { status: 'live' });
    await setInnings(id, match.currentInnings, newInning);
    loadData();
  };

  const endInning = async (innOverride?: Innings) => {
    const currentInn = innOverride || inning;
    if (!match || !currentInn) return;
    const isFirstInn = match.currentInnings === 1;
    
    // Mark current inning as completed
    await updateInnings(id, match.currentInnings, { isCompleted: true });

    if (isFirstInn) {
      await updateMatch(id, { currentInnings: 2, status: 'break' });
      // Create empty 2nd innings
      const bowlTeam = batTeamId === match.team1Id ? t1 : t2; // Prev bowl team is now bat team
      const batTeam = batTeamId === match.team1Id ? t2 : t1; 
      
      await showAlert("Innings Over", "1st Innings Completed! Please set up the 2nd Innings details.", "success");
      loadData();
    } else {
      // 2nd Innings end - Match Completed
      let result = "Match Completed";
      const inn1 = firstInning || await getInnings(id, 1);
      if (inn1) {
        if (inn1.totalRuns > currentInn.totalRuns) {
          result = `${inn1.battingTeamName} won by ${inn1.totalRuns - currentInn.totalRuns} runs`;
        } else if (currentInn.totalRuns > inn1.totalRuns) {
          result = `${currentInn.battingTeamName} won by ${10 - currentInn.wickets} wickets`;
        } else {
          result = "Match Tied";
        }
      }
      await updateMatch(id, { status: 'completed', result });
      await showAlert("Match Completed!", result, "success");
      router.push('/admin/matches');
    }
  };

  const calculateRRR = () => {
    if (!match || !inning || !firstInning) return '0.00';
    const target = firstInning.totalRuns + 1;
    const needed = target - inning.totalRuns;
    if (needed <= 0) return '0.00';
    const totalBalls = (match.overs || 0) * 6;
    const bowledBalls = (inning.overs * 6) + inning.balls;
    const remainingBalls = totalBalls - bowledBalls;
    
    if (remainingBalls <= 0) return '∞';
    return ((needed / remainingBalls) * 6).toFixed(2);
  };

  const handleScore = async (runs: number, extraType: 'wd'|'nb'|'bye'|'lb'|null = null, isWicket = false, isAdjustment = false) => {
    if (!match || !inning) return;

    let updatedInning = { ...inning };
    let extras = { ...updatedInning.extras };
    let swap = false;
    let isLegal = (extraType !== 'wd' && extraType !== 'nb' && !isAdjustment);

    // If it's pure run adjustment, we just add to totals/batsman without affecting ball counts
    if (isAdjustment) {
      updatedInning.totalRuns += runs;
      const batsmen = [...updatedInning.batsmen];
      const sIdx = batsmen.findIndex(b => b.playerId === updatedInning.currentBatsmen[0]);
      if (sIdx !== -1) batsmen[sIdx].runs += runs;
      
      const bowlers = [...updatedInning.bowlers];
      const bwIdx = bowlers.findIndex(b => b.playerId === updatedInning.currentBowler);
      if (bwIdx !== -1) bowlers[bwIdx].runs += runs;

      updatedInning.batsmen = batsmen;
      updatedInning.bowlers = bowlers;
      await updateInnings(id, match.currentInnings, updatedInning);
      setInning(updatedInning);
      return;
    }

    // 1. Calculate Runs and Extras
    let penalty = 0;
    if (extraType === 'wd') {
      penalty = widePenalty;
      extras.wides += (runs + penalty);
      extras.total += (runs + penalty);
    } else if (extraType === 'nb') {
      penalty = noBallPenalty;
      extras.noBalls += (runs + penalty);
      extras.total += (runs + penalty);
    } else if (extraType === 'lb') {
      extras.legByes += runs;
      extras.total += runs;
    } else if (extraType === 'bye') {
      extras.byes += runs;
      extras.total += runs;
    }

    updatedInning.totalRuns += (runs + penalty);
    updatedInning.extras = extras;

    // 2. Overs/Balls logic
    if (isLegal) {
      updatedInning.balls++;
      if (updatedInning.balls === 6) {
        updatedInning.overs++;
        updatedInning.balls = 0;
        swap = true; // Over end swap
      }
    }

    // 3. Batsman Update
    const batsmen = [...updatedInning.batsmen];
    const sIdx = batsmen.findIndex(b => b.playerId === updatedInning.currentBatsmen[0]);
    if (sIdx !== -1 && extraType !== 'wd') {
      const batsmanRuns = (extraType === 'lb' || extraType === 'bye') ? 0 : runs;
      batsmen[sIdx].runs += batsmanRuns;
      batsmen[sIdx].balls++;
      if (batsmanRuns === 4) batsmen[sIdx].fours++;
      if (batsmanRuns === 6) batsmen[sIdx].sixes++;
      if (batsmanRuns % 2 !== 0) swap = !swap;
    }

    // 4. Bowler Update
    const bowlers = [...updatedInning.bowlers];
    const bwIdx = bowlers.findIndex(b => b.playerId === updatedInning.currentBowler);
    if (bwIdx !== -1) {
      if (extraType !== 'lb' && extraType !== 'bye') {
        bowlers[bwIdx].runs += (runs + penalty);
      }
      if (isLegal) {
        bowlers[bwIdx].balls++;
        if (bowlers[bwIdx].balls === 6) {
          bowlers[bwIdx].overs++;
          bowlers[bwIdx].balls = 0;
        }
      }
      if (extraType === 'wd') bowlers[bwIdx].wides++;
      if (extraType === 'nb') bowlers[bwIdx].noBalls++;
    }

    if (swap) {
      updatedInning.currentBatsmen = [updatedInning.currentBatsmen[1], updatedInning.currentBatsmen[0]];
    }

    updatedInning.batsmen = batsmen;
    updatedInning.bowlers = bowlers;
    updatedInning.runRate = (updatedInning.totalRuns / (updatedInning.overs + updatedInning.balls / 6)) || 0;

    const scoreStr = `${updatedInning.totalRuns}/${updatedInning.wickets} (${updatedInning.overs}.${updatedInning.balls})`;
    await updateInnings(id, match.currentInnings, updatedInning);
    await updateMatch(id, { [match.currentInnings === 1 ? 'score1' : 'score2']: scoreStr });
    
    setInning(updatedInning);

    // Over end check
    if (swap && updatedInning.balls === 0 && !updatedInning.isCompleted) {
      setShowBowlerModal(true);
    }

    // Inning completion check
    const isFirstInn = match.currentInnings === 1;
    let autoComplete = false;

    if (isFirstInn) {
      if (updatedInning.overs === match.overs || updatedInning.wickets === 10) autoComplete = true;
    } else {
      // 2nd innings
      const inn1 = firstInning || await getInnings(id, 1);
      if (inn1 && updatedInning.totalRuns > inn1.totalRuns) {
        autoComplete = true; // Target reached
      } else if (updatedInning.overs === match.overs || updatedInning.wickets === 10) {
        autoComplete = true; // All balls/wickets used
      }
    }

    if (autoComplete) {
      const ok = await showConfirm("Innings Completed", "The current innings has reached its target/limit. End innings now?");
      if (ok) {
        await endInning(updatedInning);
      }
    }
  };

  const handleWicket = async () => {
    if (!inning || !outBatsmanId || !newBatsmanId) return showAlert('Incomplete Details', 'Please select the out batsman and the next player to come in.', 'warning');
    
    let updatedInning = { ...inning };
    updatedInning.wickets++;
    
    // Update batsman out
    const batsmen = [...updatedInning.batsmen];
    const oIdx = batsmen.findIndex(b => b.playerId === outBatsmanId);
    if (oIdx !== -1) {
      batsmen[oIdx].isOut = true;
      batsmen[oIdx].dismissal = dismissalType;
    }

    // Add new batsman
    const batTeam = updatedInning.battingTeamId === match?.team1Id ? t1 : t2;
    const newB = batTeam?.players.find(p => p.id === newBatsmanId);
    if (newB) {
      batsmen.push({
        playerId: newB.id, playerName: newB.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, strikeRate: 0
      });
      // Replace in current pair
      const pair = [...updatedInning.currentBatsmen];
      const pIdx = pair.indexOf(outBatsmanId);
      if (pIdx !== -1) pair[pIdx] = newB.id;
      updatedInning.currentBatsmen = pair as [string, string];
    }

    // Update bowler wickets
    const bowlers = [...updatedInning.bowlers];
    const bwIdx = bowlers.findIndex(b => b.playerId === updatedInning.currentBowler);
    if (bwIdx !== -1 && !['runout', 'retired'].includes(dismissalType)) {
      bowlers[bwIdx].wickets++;
    }

    // Over count for wicket
    updatedInning.balls++;
    if (updatedInning.balls === 6) { updatedInning.overs++; updatedInning.balls = 0; }
    if (bwIdx !== -1) {
       bowlers[bwIdx].balls++;
       if (bowlers[bwIdx].balls === 6) { bowlers[bwIdx].overs++; bowlers[bwIdx].balls = 0; }
    }

    updatedInning.batsmen = batsmen;
    updatedInning.bowlers = bowlers;
    
    const scoreStr = `${updatedInning.totalRuns}/${updatedInning.wickets} (${updatedInning.overs}.${updatedInning.balls})`;
    await updateInnings(id, match!.currentInnings, updatedInning);
    await updateMatch(id, { [match!.currentInnings === 1 ? 'score1' : 'score2']: scoreStr });
    
    setShowWicketModal(false);
    
    if (updatedInning.wickets === 10) {
      const ok = await showConfirm("All Out!", "10 Wickets are down. End the current innings?");
      if (ok) {
        await endInning(updatedInning);
        return;
      }
    }
    
    loadData();
  };

  if (loading) return <div className="spinner-overlay"><div className="spinner" /></div>;
  if (!match) return <div>Match not found</div>;

  // Render Logic
  if (!match.tossWinner) {
    return (
      <div className="card card-padded" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h2 className="mb-20" style={{ textAlign: 'center' }}>💰 Match Toss</h2>
        
        <div className="form-group">
          <label className="form-label">Toss Won By</label>
          <select className="form-select" value={tossSelection} onChange={e => setTossSelection(e.target.value as any)}>
            <option value="">- Select Team -</option>
            <option value="1">{match.team1Name || 'Team 1'}</option>
            <option value="2">{match.team2Name || 'Team 2'}</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Decision</label>
          <select className="form-select" value={tossDecision} onChange={e => setTossDecision(e.target.value as any)}>
            <option value="bat">Batting First</option>
            <option value="field">Fielding First</option>
          </select>
        </div>

        <button className="btn btn-primary w-full mt-20" onClick={handleToss}>
          Confirm Toss Result
        </button>
      </div>
    );
  }

  if (!inning) {
    const batTeam = batTeamId === match.team1Id ? t1 : t2;
    const bowlTeam = batTeamId === match.team1Id ? t2 : t1;
    return (
      <div className="card card-padded">
        <h2 className="mb-16">🏏 Start Innings {match.currentInnings}</h2>
        <p className="mb-16" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {match.tossWinner === match.team1Id ? match.team1Name : match.team2Name} won the toss and elected to {match.tossDecision}.
        </p>
        <div className="form-row">
            <div className="form-group">
                <label className="form-label">Striker</label>
                <select className="form-select" value={strikerId} onChange={e => setStrikerId(e.target.value)}>
                    <option value="">- Select -</option>
                    {batTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Non-Striker</label>
                <select className="form-select" value={nonStrikerId} onChange={e => setNonStrikerId(e.target.value)}>
                    <option value="">- Select -</option>
                    {batTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        </div>
        <div className="form-group">
            <label className="form-label">Opening Bowler</label>
            <select className="form-select" value={bowlerId} onChange={e => setBowlerId(e.target.value)}>
                <option value="">- Select -</option>
                {bowlTeam?.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
        <button className="btn btn-primary w-full mt-16" onClick={initInning}>Start Match</button>
      </div>
    );
  }

  const striker = inning.batsmen.find(b => b.playerId === inning.currentBatsmen[0]);
  const nonStriker = inning.batsmen.find(b => b.playerId === inning.currentBatsmen[1]);
  const currentBowler = inning.bowlers.find(b => b.playerId === inning.currentBowler);

  return (
    <div className="scoring-panel">
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ fontSize: 13, background: 'var(--surface2)', padding: '4px 12px', borderRadius: 20 }}>
            💰 Toss: <strong>{tossWinner === match.team1Id ? match.team1Name : match.team2Name}</strong> elected to <strong>{tossDecision}</strong>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/match/${id}`, '_blank')}>
            👁️ Preview User View
          </button>
      </div>

      <div className="score-hero mb-20">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{inning.battingTeamName}</div>
            <div style={{ fontSize: 48, fontWeight: 900 }}>{inning.totalRuns}/{inning.wickets}</div>
            {match.currentInnings === 2 && firstInning && (
              <div style={{ fontSize: 14, marginTop: -5, fontWeight: 600, color: '#f6ad55' }}>
                Target: {firstInning.totalRuns + 1} <span style={{ fontWeight: 400, opacity: 0.8, marginLeft: 8 }}>(First Inn: {firstInning.totalRuns})</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Overs: {inning.overs}.{inning.balls}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              CRR: {inning.runRate.toFixed(2)}
              {match.currentInnings === 2 && firstInning && (
                <span style={{ marginLeft: 10, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                  RRR: {calculateRRR()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Game Summary for Scorer */}
        {match.currentInnings === 2 && firstInning && (() => {
           const target = firstInning.totalRuns + 1;
           const needed = target - inning.totalRuns;
           const totalB = match.overs * 6;
           const bowledB = (inning.overs * 6) + inning.balls;
           const remB = totalB - bowledB;
           return (
             <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: '#f6ad55', display: 'flex', justifyContent: 'center' }}>
                 NEED {needed} RUNS FROM {remB} BALLS
               </div>
             </div>
           );
        })()}
      </div>

      <div className="grid-2">
        {/* Batsmen Tracking */}
        <div className="card card-padded">
          <h4 className="mb-12" style={{ textTransform: 'uppercase', fontSize: 12, opacity: 0.6 }}>Current Batsmen</h4>
          <div className="batsman-row active">
            <span>🏏 {striker?.playerName}*</span>
            <strong>{striker?.runs} ({striker?.balls})</strong>
          </div>
          <div className="batsman-row">
            <span>{nonStriker?.playerName}</span>
            <strong>{nonStriker?.runs} ({nonStriker?.balls})</strong>
          </div>
        </div>

        {/* Bowler Details */}
        <div className="card card-padded">
          <h4 className="mb-12" style={{ textTransform: 'uppercase', fontSize: 12, opacity: 0.6 }}>Current Bowler</h4>
          <div className="batsman-row">
            <span>🥎 {currentBowler?.playerName}</span>
            <strong>{currentBowler?.wickets}-{currentBowler?.runs} ({currentBowler?.overs}.{currentBowler?.balls})</strong>
          </div>
        </div>
      </div>

      <div className="scoring-actions mt-20">
        <div className="scoring-grid">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button key={r} className={`score-btn btn-${r}`} onClick={() => handleScore(r)}>{r}</button>
          ))}
          <button className="score-btn btn-wd" onClick={() => handleScore(0, 'wd')}>WD</button>
          <button className="score-btn btn-nb" onClick={() => handleScore(0, 'nb')}>NB</button>
          <button className="score-btn btn-bye" onClick={() => handleScore(1, 'bye')}>Bye</button>
          <button className="score-btn btn-bye" onClick={() => handleScore(1, 'lb')}>LB</button>
          <button className="score-btn btn-w" onClick={() => setShowWicketModal(true)}>OUT</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button className="btn btn-ghost w-full" onClick={() => {
                const pair = [...inning.currentBatsmen];
                setInning({ ...inning, currentBatsmen: [pair[1], pair[0]] });
            }}>🔄 Switch Striker</button>
            <button className="btn btn-ghost w-full" onClick={() => setShowBowlerModal(true)}>🥎 Change Bowler</button>
        </div>

        {/* Manual Adjustments */}
        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 15, background: 'var(--surface2)', padding: '16px 20px', borderRadius: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Quick Adjust (Runs & Wickets):</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleScore(-1, null, false, true)}>Run -1</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleScore(1, null, false, true)}>Run +1</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#e53e3e' }} onClick={async () => {
                        if (inning.wickets > 0) await updateInnings(id, match!.currentInnings, { ...inning, wickets: inning.wickets - 1 });
                        loadData();
                    }}>Wicket -1</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 15 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Bowler Adjustments:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                       const bowlers = [...inning.bowlers];
                       const bIdx = bowlers.findIndex(b => b.playerId === inning.currentBowler);
                       if (bIdx !== -1) {
                         if (bowlers[bIdx].balls > 0) bowlers[bIdx].balls--;
                         else if (bowlers[bIdx].overs > 0) { bowlers[bIdx].overs--; bowlers[bIdx].balls = 5; }
                         await updateInnings(id, match!.currentInnings, { ...inning, bowlers });
                         loadData();
                       }
                    }}>Ball -1</button>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                       const bowlers = [...inning.bowlers];
                       const bIdx = bowlers.findIndex(b => b.playerId === inning.currentBowler);
                       if (bIdx !== -1) {
                         bowlers[bIdx].runs = Math.max(0, bowlers[bIdx].runs - 1);
                         await updateInnings(id, match!.currentInnings, { ...inning, bowlers });
                         loadData();
                       }
                    }}>Bowl Run -1</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 15 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Extras & Rules:</span>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 11 }}>WD:</label>
                      <input type="number" className="form-input" style={{ width: 45, padding: 4 }} value={widePenalty} onChange={e => setWidePenalty(parseInt(e.target.value))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 11 }}>NB:</label>
                      <input type="number" className="form-input" style={{ width: 45, padding: 4 }} value={noBallPenalty} onChange={e => setNoBallPenalty(parseInt(e.target.value))} />
                  </div>
                </div>
                <button className="btn btn-danger btn-sm mt-8" onClick={async () => {
                  const ok = await showConfirm("End Innings?", "Are you sure you want to end this innings manually?");
                  if (ok) endInning();
                }}>🏁 End Innings Manual</button>
            </div>
        </div>
      </div>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="mb-16">Wicket Down</h3>
            <div className="form-group">
                <label className="form-label">Who is Out?</label>
                <select className="form-select" value={outBatsmanId} onChange={e => setOutBatsmanId(e.target.value)}>
                    <option value="">- Select -</option>
                    <option value={striker?.playerId}>{striker?.playerName}</option>
                    <option value={nonStriker?.playerId}>{nonStriker?.playerName}</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Dismissal Type</label>
                <select className="form-select" value={dismissalType} onChange={e => setDismissalType(e.target.value)}>
                    <option value="caught">Caught</option>
                    <option value="bowled">Bowled</option>
                    <option value="lbw">LBW</option>
                    <option value="runout">Run Out</option>
                    <option value="stumped">Stumped</option>
                    <option value="hitwicket">Hit Wicket</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Next Batsman</label>
                <select className="form-select" value={newBatsmanId} onChange={e => setNewBatsmanId(e.target.value)}>
                    <option value="">- Select -</option>
                    {(batTeamId === match.team1Id ? t1 : t2)?.players
                      .filter(p => !inning.batsmen.some(b => b.playerId === p.id))
                      .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    }
                </select>
            </div>
            <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowWicketModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleWicket}>Confirm Wicket</button>
            </div>
          </div>
        </div>
      )}

      {/* Bowler Modal */}
      {showBowlerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="mb-16">Select Next Bowler</h3>
            <div className="form-group">
                <label className="form-label">Bowler</label>
                <select className="form-select" value={bowlerId} onChange={e => setBowlerId(e.target.value)}>
                    <option value="">- Select -</option>
                    {(batTeamId === match.team1Id ? t2 : t1)?.players.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowBowlerModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                    if (!bowlerId) return;
                    const bowlTeam = batTeamId === match.team1Id ? t2 : t1;
                    const p = bowlTeam?.players.find(x => x.id === bowlerId);
                    if (!p) return;
                    
                    let updatedInning = { ...inning };
                    if (!updatedInning.bowlers.find(b => b.playerId === p.id)) {
                        updatedInning.bowlers.push({
                            playerId: p.id, playerName: p.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0
                        });
                    }
                    updatedInning.currentBowler = p.id;
                    await updateInnings(id, match.currentInnings, updatedInning);
                    setInning(updatedInning);
                    setShowBowlerModal(false);
                }}>Confirm Bowler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
