import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Match, Team, Tournament, Innings, Delivery, UserProfile } from './types';

// ─── Teams ───────────────────────────────────────────────────────────────────
export const addTeam = (data: Omit<Team, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'teams'), { ...data, createdAt: serverTimestamp() });

export const updateTeam = (id: string, data: Partial<Team>) => {
  if (!id) return Promise.reject('No Team ID');
  return updateDoc(doc(db, 'teams', id), data);
};

export const deleteTeam = (id: string) => {
  if (!id) return Promise.reject('No Team ID');
  return deleteDoc(doc(db, 'teams', id));
};

export const getTeams = async (): Promise<Team[]> => {
  const snap = await getDocs(query(collection(db, 'teams'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
};

export const getTeam = async (id: string): Promise<Team | null> => {
  if (!id) return null;
  const snap = await getDoc(doc(db, 'teams', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
};

// ─── Tournaments ──────────────────────────────────────────────────────────────
export const addTournament = (data: Omit<Tournament, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'tournaments'), { ...data, createdAt: serverTimestamp() });

export const updateTournament = (id: string, data: Partial<Tournament>) => {
  if (!id) return Promise.reject('No Tournament ID');
  return updateDoc(doc(db, 'tournaments', id), data);
};

export const deleteTournament = (id: string) => {
  if (!id) return Promise.reject('No Tournament ID');
  return deleteDoc(doc(db, 'tournaments', id));
};

export const getTournaments = async (): Promise<Tournament[]> => {
  const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
};

export const getTournament = async (id: string): Promise<Tournament | null> => {
  if (!id) return null;
  const snap = await getDoc(doc(db, 'tournaments', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Tournament) : null;
};

// ─── Matches ──────────────────────────────────────────────────────────────────
export const addMatch = (data: Omit<Match, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'matches'), { ...data, createdAt: serverTimestamp() });

export const updateMatch = (id: string, data: Partial<Match>) => {
  if (!id) return Promise.reject('No Match ID');
  return updateDoc(doc(db, 'matches', id), data);
};

export const deleteMatch = (id: string) => {
  if (!id) return Promise.reject('No Match ID');
  return deleteDoc(doc(db, 'matches', id));
};

export const getMatch = async (id: string): Promise<Match | null> => {
  if (!id) return null;
  const snap = await getDoc(doc(db, 'matches', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null;
};

export const getLiveMatches = async (): Promise<Match[]> => {
  const snap = await getDocs(query(collection(db, 'matches'), where('status', '==', 'live')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
};

export const getAllMatches = async (): Promise<Match[]> => {
  const snap = await getDocs(query(collection(db, 'matches'), orderBy('scheduledDate', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
};

export const subscribeToMatch = (matchId: string, cb: (m: Match) => void) =>
  onSnapshot(doc(db, 'matches', matchId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Match);
  });

export const subscribeToMatches = (cb: (m: Match[]) => void) =>
  onSnapshot(query(collection(db, 'matches'), orderBy('scheduledDate', 'asc')), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
  });

// ─── Innings ──────────────────────────────────────────────────────────────────
export const setInnings = (matchId: string, inningsNo: 1 | 2, data: Innings) =>
  setDoc(doc(db, 'matches', matchId, 'innings', String(inningsNo)), data);

export const updateInnings = (matchId: string, inningsNo: 1 | 2, data: Partial<Innings>) =>
  updateDoc(doc(db, 'matches', matchId, 'innings', String(inningsNo)), data);

export const getInnings = async (matchId: string, inningsNo: 1 | 2): Promise<Innings | null> => {
  const snap = await getDoc(doc(db, 'matches', matchId, 'innings', String(inningsNo)));
  return snap.exists() ? (snap.data() as Innings) : null;
};

export const subscribeToInnings = (matchId: string, inningsNo: 1 | 2, cb: (i: Innings) => void) =>
  onSnapshot(doc(db, 'matches', matchId, 'innings', String(inningsNo)), snap => {
    if (snap.exists()) cb(snap.data() as Innings);
  });

// ─── Deliveries ───────────────────────────────────────────────────────────────
export const addDelivery = (matchId: string, data: Omit<Delivery, 'id' | 'timestamp'>) =>
  addDoc(collection(db, 'matches', matchId, 'deliveries'), {
    ...data,
    timestamp: serverTimestamp(),
  });

export const getDeliveries = async (matchId: string, innings: 1 | 2): Promise<Delivery[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'matches', matchId, 'deliveries'),
      where('innings', '==', innings),
      orderBy('timestamp', 'asc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Delivery));
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = async (): Promise<UserProfile[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => d.data() as UserProfile);
};

export const updateUserRole = (uid: string, role: 'admin' | 'scorer' | 'viewer', assignedMatchId?: string) =>
  updateDoc(doc(db, 'users', uid), { role, ...(assignedMatchId !== undefined && { assignedMatchId }) });
