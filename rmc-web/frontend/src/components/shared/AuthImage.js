import React from 'react';
import { useFileObjectUrl } from '../../services/files';

// Renders an image stored under /uploads, which now requires a session.
// A browser will not send the Authorization header for a plain <img src>, so
// the file is fetched through axios and shown from a blob URL instead.
// Renders nothing while loading or if access is refused, letting the caller's
// placeholder show through.
function AuthImage({ path, alt, ...rest }) {
  const url = useFileObjectUrl(path);
  if (!url) return null;
  return <img src={url} alt={alt} {...rest} />;
}

export default AuthImage;
