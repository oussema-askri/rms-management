import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fileUrl } from '../../constants/config';
import { COLORS } from '../../constants/config';

// Stored images live behind /uploads, which requires a session. A plain
// <Image source={{uri}}> sends no Authorization header and gets a 401, which is
// why uploaded employee photos never appeared anywhere in the app.
//
// React Native's Image accepts per-request headers, so the only thing needed is
// to read the token first. While it loads, or if the file is missing or refused,
// the `fallback` is shown instead of a broken image box.
function AuthImage({ path, style, fallback, resizeMode = 'cover' }) {
  const [headers, setHeaders] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!path) {
      setHeaders(null);
      return () => { cancelled = true; };
    }

    AsyncStorage.getItem('token')
      .then((token) => {
        if (cancelled) return;
        setHeaders(token ? { Authorization: `Bearer ${token}` } : {});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [path]);

  if (!path || failed || !headers) {
    return fallback !== undefined ? fallback : <View style={style} />;
  }

  return (
    <Image
      source={{ uri: fileUrl(path), headers }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

// Circular avatar that falls back to the person's initial, so a missing or
// forbidden photo still renders something deliberate.
export function AuthAvatar({ path, name, size = 48, style }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <AuthImage
      path={path}
      style={[circle, style]}
      fallback={
        <View style={[circle, styles.fallback, style]}>
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default AuthImage;
