import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadImage = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadTeamLogo = (teamId: string, file: File) =>
  uploadImage(file, `teams/${teamId}/logo_${file.name}`);

export const uploadTournamentLogo = (tournamentId: string, file: File) =>
  uploadImage(file, `tournaments/${tournamentId}/logo_${file.name}`);

export const uploadTournamentBanner = (tournamentId: string, file: File) =>
  uploadImage(file, `tournaments/${tournamentId}/banner_${file.name}`);

export const deleteImage = (url: string) => {
  const storageRef = ref(storage, url);
  return deleteObject(storageRef);
};
