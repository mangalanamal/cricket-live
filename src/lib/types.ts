export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper' | 'none';
  avatarUrl?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  players: Player[];
  createdAt: Date;
}

export interface Tournament {
  id: string;
  name: string;
  logoUrl?: string;
  bannerUrl?: string;
  format: 'T20' | 'ODI' | 'Test' | 'Softball Cricket';
  startDate: string;
  endDate: string;
  venue?: string;
  sponsors?: { name: string; url?: string; logoUrl?: string }[];
  stages?: string[]; // e.g. "Group Stage", "Super 8", "Final"
  groups?: { id: string; name: string; teamIds: string[] }[];
  createdAt: Date;
}

export type MatchStatus = 'scheduled' | 'toss' | 'live' | 'break' | 'completed' | 'cancelled';

export interface Match {
  token: boolean;
  id: string;
  tournamentId: string;
  tournamentName: string;
  stageId?: string; // Links to tournament stages
  groupId?: string; // Links to tournament groups

  team1Id: string;
  team1Name: string;
  team1ShortName: string;
  team1Logo?: string;
  team1PlayingXI?: string[]; // array of player IDs

  team2Id: string;
  team2Name: string;
  team2ShortName: string;
  team2Logo?: string;
  team2PlayingXI?: string[]; // array of player IDs

  isDraftMatch?: boolean; // if true, team1Name/team2Name can be "Winner of Semi 1" and ids can be empty

  venue: string;
  scheduledDate: string;
  scheduledTime: string;
  format: 'T20' | 'ODI' | 'Test' | 'Softball Cricket';
  overs: number;
  status: MatchStatus;
  tossWinner?: string;
  tossDecision?: 'bat' | 'field';
  scorerId?: string;
  result?: string;
  currentInnings: 1 | 2;
  createdAt: Date;
}

export interface BatsmanScore {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
  strikeRate: number;
}

export interface BowlerScore {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

export interface Innings {
  inningsNo: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  runRate: number;
  targetRuns?: number;
  requiredRunRate?: number;
  batsmen: BatsmanScore[];
  bowlers: BowlerScore[];
  fallOfWickets: { wicket: number; runs: number; overs: string; playerName: string }[];
  currentBatsmen: [string, string]; // [striker, non-striker] playerIds
  currentBowler: string;
  isCompleted: boolean;
}

export interface Delivery {
  id: string;
  innings: 1 | 2;
  over: number;
  ball: number;
  batsmanId: string;
  batsmanName: string;
  bowlerId: string;
  bowlerName: string;
  runs: number;
  extras: { type: 'wide' | 'noball' | 'bye' | 'legbye' | null; runs: number };
  isWicket: boolean;
  wicketType?: string;
  wicketPlayerId?: string;
  timestamp: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'scorer' | 'viewer';
  assignedMatchId?: string;
}
