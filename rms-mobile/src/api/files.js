// SDK 57's main expo-file-system export is the new File/Directory/Paths API and
// no longer has downloadAsync or documentDirectory, so after the upgrade both
// were undefined here and every document download threw. The classic functions
// live under /legacy, which is what the other screens already import.
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fileUrl } from '../constants/config';

// /uploads used to be public, so a bare downloadAsync was enough. It now
// requires a session, and FileSystem.downloadAsync does not go through the
// axios instance, so the token has to be attached explicitly here.
export const downloadStoredFile = async (storedPath, fileName) => {
  if (!storedPath) throw new Error('Aucun document disponible');

  const token = await AsyncStorage.getItem('token');
  const target = FileSystem.documentDirectory + fileName;

  const result = await FileSystem.downloadAsync(fileUrl(storedPath), target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status === 401) {
    throw new Error('Session expirée. Reconnectez-vous.');
  }
  if (result.status === 403) {
    throw new Error("Vous n'avez pas accès à ce document.");
  }
  if (result.status === 404) {
    throw new Error('Document introuvable.');
  }
  if (result.status !== 200) {
    throw new Error(`Téléchargement échoué (${result.status})`);
  }

  return result.uri;
};
