// Every backend route returns { success, data }. routes/client.js used to
// return bare arrays and objects, which is why several screens carried their own
// Array.isArray fallback. This keeps that tolerance in one place.
export const unwrap = (response, fallback = null) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data ?? fallback;
  return body ?? fallback;
};

export const unwrapList = (response) => {
  const value = unwrap(response, []);
  return Array.isArray(value) ? value : [];
};
