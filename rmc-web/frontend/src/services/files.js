import { useEffect, useState } from 'react';
import axios from 'axios';
import { fileUrl } from '../config';

// Stored files used to be served by express.static, so a plain URL was enough
// to view one. They now require a session, which a browser will not attach to a
// window.open() or an <img src>. These helpers fetch the file through axios,
// which does send the token, and hand back a blob URL instead.

const authedRequest = (storedPath) =>
  axios.get(fileUrl(storedPath), {
    responseType: 'blob',
    headers: (() => {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    })(),
  });

const describeError = (error) => {
  const status = error.response?.status;
  if (status === 401) return 'Session expirée. Reconnectez-vous.';
  if (status === 403) return "Vous n'avez pas accès à ce fichier.";
  if (status === 404) return 'Fichier introuvable.';
  return "Impossible d'ouvrir le fichier.";
};

// Open a stored file in a new tab.
// Types a browser can render in a tab. Anything else (notably .docx) is saved.
const VIEWABLE = /\.(pdf|jpe?g|png|gif|webp|bmp|svg)$/i;

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const openFile = async (storedPath) => {
  if (!storedPath) return;

  const fileName = String(storedPath).split(/[\\/]/).pop();

  // The tab has to be opened synchronously, while the click is still the
  // current user gesture. Opening it after the await got it blocked as a popup,
  // so the button silently did nothing.
  const viewable = VIEWABLE.test(fileName);
  const tab = viewable ? window.open('', '_blank', 'noopener') : null;

  try {
    const response = await authedRequest(storedPath);

    if (tab && !tab.closed) {
      const url = URL.createObjectURL(response.data);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    // Not viewable in a tab, or the popup was blocked anyway: save it instead.
    // A download link is never popup-blocked.
    saveBlob(response.data, fileName);
  } catch (error) {
    if (tab && !tab.closed) tab.close();
    alert(describeError(error));
  }
};

// Download a stored file under a chosen name.
export const downloadFile = async (storedPath, fileName) => {
  if (!storedPath) return;
  try {
    const response = await authedRequest(storedPath);
    saveBlob(response.data, fileName || String(storedPath).split(/[\\/]/).pop());
  } catch (error) {
    alert(describeError(error));
  }
};

// Blob URL for rendering a protected image, revoked when the value changes or
// the component unmounts.
export const useFileObjectUrl = (storedPath) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!storedPath) {
      setUrl('');
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;

    authedRequest(storedPath)
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl('');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storedPath]);

  return url;
};
