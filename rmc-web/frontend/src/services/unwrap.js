// Response-shape helpers, kept free of axios so they can be unit tested without
// pulling the HTTP client into the test environment.
//
// Every backend route returns { success, data }. routes/client.js used to return
// bare arrays and objects, which is why several screens carried their own
// Array.isArray fallback. That tolerance now lives here, in one place.

export const unwrap = (response, fallback = null) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data ?? fallback;
  return body ?? fallback;
};

export const unwrapList = (response) => {
  const value = unwrap(response, []);
  return Array.isArray(value) ? value : [];
};
