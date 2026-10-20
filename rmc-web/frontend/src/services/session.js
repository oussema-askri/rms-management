// The sign-in token, kept per browser tab.
//
// It used to live only in localStorage, which every tab shares. Signing in as a
// second account in another tab silently replaced the token under the first
// one: that tab went on showing, say, the RH dashboard while sending the
// comptable's token, so its buttons failed with "role not authorized", and a
// reload asked the server who was signed in, got the other role and bounced to
// the landing page, which looked like being signed out.
//
// Each tab now pins its own token in sessionStorage, which survives a reload but
// is not shared between tabs. localStorage keeps the most recent sign-in so that
// a new tab, or the browser reopened, starts signed in as that account.

const KEY = 'token';

const read = (store) => {
  try {
    return store.getItem(KEY);
  } catch {
    return null; // storage blocked (private mode, site data disabled)
  }
};

const write = (store, value) => {
  try {
    if (value) store.setItem(KEY, value);
    else store.removeItem(KEY);
  } catch {
    // ignore: the session then lasts only as long as the page
  }
};

export const getToken = () => {
  const own = read(sessionStorage);
  if (own) return own;

  // First read in a new tab: adopt the latest sign-in and pin it to this tab, so
  // a later sign-in elsewhere cannot swap it out from under this page.
  const latest = read(localStorage);
  if (latest) write(sessionStorage, latest);
  return latest;
};

export const setToken = (token) => {
  write(sessionStorage, token);
  write(localStorage, token);
};

export const clearToken = () => {
  const own = read(sessionStorage);
  write(sessionStorage, null);
  // Only forget the shared copy if it is this tab's. Another tab may have
  // signed in since, and its session must not end because this one did.
  if (own && read(localStorage) === own) write(localStorage, null);
};
