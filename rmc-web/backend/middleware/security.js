// Security middleware implemented without extra dependencies so the app stays
// installable with the packages already in package.json.

// ── Response headers ───────────────────────────────────────────────────────
// A small subset of what helmet would set, covering what matters for a JSON API
// that also streams stored files.
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Only meaningful once the API is behind TLS; harmless over plain HTTP.
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  res.removeHeader('X-Powered-By');
  next();
};

// ── Rate limiting ──────────────────────────────────────────────────────────
// Fixed-window counter kept in memory. This is per process, so it does not hold
// across a multi-instance deployment; put a limiter in front of the app there.
const createRateLimiter = ({ windowMs, max, message, skipSuccessful = false }) => {
  const hits = new Map();

  // Drop expired buckets so the map cannot grow without bound.
  const sweep = (now) => {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  };

  let lastSweep = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      sweep(now);
      lastSweep = now;
    }

    // Trust the proxy header only when the app is told it is behind one.
    const forwarded = process.env.TRUST_PROXY === 'true'
      ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      : '';
    const key = forwarded || req.ip || req.connection?.remoteAddress || 'unknown';

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((entry.resetAt - now) / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message: message || 'Trop de requêtes, réessayez plus tard.' });
    }

    // Refund the hit when the request succeeded. Brute force is about failed
    // attempts; counting successes too means a shared office address, where
    // everyone leaves through one public IP, locks the whole company out after
    // a handful of normal sign-ins.
    if (skipSuccessful) {
      res.on('finish', () => {
        if (res.statusCode < 400 && entry.count > 0) entry.count -= 1;
      });
    }

    return next();
  };
};

// Credential endpoints. Only failures count, so this is a budget for wrong
// passwords rather than a cap on how many people may sign in.
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Trop de tentatives de connexion échouées. Réessayez dans 15 minutes.',
  skipSuccessful: true,
});

// Everything else: generous, only there to blunt runaway clients.
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
});

// ── CORS ───────────────────────────────────────────────────────────────────
// cors() with no options reflects any origin. Build an explicit allowlist from
// CORS_ORIGINS instead, falling back to local development hosts.
const buildCorsOptions = () => {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowlist = configured.length
    ? configured
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  return {
    origin(origin, callback) {
      // Requests with no Origin are native apps, curl and server-to-server
      // calls; the browser same-origin rules that CORS enforces do not apply.
      if (!origin) return callback(null, true);
      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
};

module.exports = {
  securityHeaders,
  createRateLimiter,
  authLimiter,
  apiLimiter,
  buildCorsOptions,
};
