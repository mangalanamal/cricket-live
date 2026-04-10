import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db, firebaseConfig } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  getAuth,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerAdmin = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(cred.user, 'admin');
  return cred;
};

// Admin can create a user for someone else without being logged out
export const adminCreateUser = async (email: string, password: string, role: 'scorer' | 'viewer' | 'admin' = 'viewer') => {
  const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await createUserProfile(cred.user, role);
    await signOut(secondaryAuth);
    return cred.user;
  } finally {
    // Delete the secondary app to prevent memory leaks or conflicts
    await deleteApp(secondaryApp);
  }
};

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};

export const createUserProfile = async (user: User, role: 'admin' | 'scorer' | 'viewer' = 'viewer') => {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
    role,
  });
};

export { onAuthStateChanged, auth };
