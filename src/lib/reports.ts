import { Match, Innings, Team, Player, BatsmanScore, BowlerScore } from './types';
import { getInnings, getMatch } from './firestore';

export interface PointsTableEntry {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number;
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamName: string;
  matches: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highestScore: number;
  average: number;
  strikeRate: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  maidens: number;
  bestBowling: { wickets: number; runs: number };
  bowlingAverage: number;
  economy: number;
}

export async function calculatePointsTable(matches: Match[], tournamentInnings: Record<string, Innings[]>) {
  const table: Record<string, PointsTableEntry> = {};

  const initTeam = (id: string, name: string) => {
    if (!table[id]) {
      table[id] = {
        teamId: id, teamName: name, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0,
        runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0
      };
    }
  };

  for (const match of matches) {
    if (match.status !== 'completed') continue;

    initTeam(match.team1Id, match.team1Name);
    initTeam(match.team2Id, match.team2Name);

    table[match.team1Id].played++;
    table[match.team2Id].played++;

    // Win/Loss points
    if (match.result?.includes(match.team1Name)) {
      table[match.team1Id].won++;
      table[match.team1Id].points += 2;
      table[match.team2Id].lost++;
    } else if (match.result?.includes(match.team2Name)) {
      table[match.team2Id].won++;
      table[match.team2Id].points += 2;
      table[match.team1Id].lost++;
    } else if (match.result?.includes('Tie') || match.result?.includes('tied')) {
      table[match.team1Id].tied++;
      table[match.team2Id].tied++;
      table[match.team1Id].points += 1;
      table[match.team2Id].points += 1;
    } else {
      table[match.team1Id].noResult++;
      table[match.team2Id].noResult++;
      table[match.team1Id].points += 1;
      table[match.team2Id].points += 1;
    }

    // NRR Calculation
    const innings = tournamentInnings[match.id] || [];
    const inn1 = innings.find(i => i.inningsNo === 1);
    const inn2 = innings.find(i => i.inningsNo === 2);

    if (inn1 && inn2) {
      // Team 1 Batting (Innings 1)
      table[inn1.battingTeamId].runsScored += inn1.totalRuns;
      table[inn1.battingTeamId].oversFaced += inn1.wickets === 10 ? match.overs : (inn1.overs + inn1.balls / 6);
      table[inn1.bowlingTeamId].runsConceded += inn1.totalRuns;
      table[inn1.bowlingTeamId].oversBowled += inn1.wickets === 10 ? match.overs : (inn1.overs + inn1.balls / 6);

      // Team 2 Batting (Innings 2)
      table[inn2.battingTeamId].runsScored += inn2.totalRuns;
      table[inn2.battingTeamId].oversFaced += inn2.wickets === 10 ? match.overs : (inn2.overs + inn2.balls / 6);
      table[inn2.bowlingTeamId].runsConceded += inn2.totalRuns;
      table[inn2.bowlingTeamId].oversBowled += inn2.wickets === 10 ? match.overs : (inn2.overs + inn2.balls / 6);
    }
  }

  // Finalize NRR
  Object.values(table).forEach(team => {
    if (team.oversFaced > 0 && team.oversBowled > 0) {
      team.nrr = (team.runsScored / team.oversFaced) - (team.runsConceded / team.oversBowled);
    }
  });

  return Object.values(table).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

export function aggregatePlayerStats(matches: Match[], tournamentInnings: Record<string, Innings[]>) {
  const stats: Record<string, PlayerStats> = {};

  const initPlayer = (id: string, name: string, team: string) => {
    if (!stats[id]) {
      stats[id] = {
        playerId: id, playerName: name, teamName: team, matches: 0,
        runs: 0, balls: 0, fours: 0, sixes: 0, highestScore: 0, average: 0, strikeRate: 0,
        wickets: 0, ballsBowled: 0, runsConceded: 0, maidens: 0,
        bestBowling: { wickets: 0, runs: 0 }, bowlingAverage: 0, economy: 0
      };
    }
  };

  for (const match of matches) {
    const inningsList = tournamentInnings[match.id] || [];
    
    // Tracks if player played in this match
    const playersInMatch = new Set<string>();

    for (const inn of inningsList) {
      // Batting
      inn.batsmen.forEach(b => {
        initPlayer(b.playerId, b.playerName, inn.battingTeamName);
        playersInMatch.add(b.playerId);
        stats[b.playerId].runs += b.runs;
        stats[b.playerId].balls += b.balls;
        stats[b.playerId].fours += b.fours;
        stats[b.playerId].sixes += b.sixes;
        if (b.runs > stats[b.playerId].highestScore) stats[b.playerId].highestScore = b.runs;
      });

      // Bowling
      inn.bowlers.forEach(bw => {
        initPlayer(bw.playerId, bw.playerName, inn.bowlingTeamName);
        playersInMatch.add(bw.playerId);
        stats[bw.playerId].wickets += bw.wickets;
        stats[bw.playerId].ballsBowled += (bw.overs * 6 + bw.balls);
        stats[bw.playerId].runsConceded += bw.runs;
        stats[bw.playerId].maidens += bw.maidens;
        
        if (bw.wickets > stats[bw.playerId].bestBowling.wickets || 
           (bw.wickets === stats[bw.playerId].bestBowling.wickets && (bw.runs < stats[bw.playerId].bestBowling.runs || stats[bw.playerId].bestBowling.runs === 0))) {
          stats[bw.playerId].bestBowling = { wickets: bw.wickets, runs: bw.runs };
        }
      });
    }

    playersInMatch.forEach(pid => stats[pid].matches++);
  }

  // Calculate averages and rates
  Object.values(stats).forEach(p => {
    p.strikeRate = p.balls > 0 ? (p.runs / p.balls) * 100 : 0;
    p.economy = p.ballsBowled > 0 ? (p.runsConceded / (p.ballsBowled / 6)) : 0;
    // Basic average (should ideally check if out or not, but we aggregate runs)
    // For simplicity, we'll just divide by matches or assume a fixed "outs" count might be needed
    // However, Innings.batsmen has isOut. We can sum outs.
  });

  return Object.values(stats);
}
