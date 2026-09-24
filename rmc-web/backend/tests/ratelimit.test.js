// The login limiter must stop password guessing without locking out an office
// that shares one public address.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const { createRateLimiter } = require('../middleware/security');

const build = (limiterOptions, handler) => {
  const app = express();
  app.use('/try', createRateLimiter(limiterOptions));
  app.post('/try', handler);
  return app;
};

const post = (baseUrl) =>
  new Promise((resolve) => {
    const req = http.request(`${baseUrl}/try`, { method: 'POST' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.end();
  });

const listen = async (app) => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
};

test('failed attempts are counted and eventually blocked', async () => {
  const app = build(
    { windowMs: 60000, max: 3, skipSuccessful: true },
    (req, res) => res.status(400).json({ message: 'wrong password' })
  );
  const { server, baseUrl } = await listen(app);

  assert.equal(await post(baseUrl), 400);
  assert.equal(await post(baseUrl), 400);
  assert.equal(await post(baseUrl), 400);
  assert.equal(await post(baseUrl), 429, 'the fourth failure should be blocked');

  server.close();
});

test('successful sign-ins do not consume the budget', async () => {
  const app = build(
    { windowMs: 60000, max: 3, skipSuccessful: true },
    (req, res) => res.status(200).json({ success: true })
  );
  const { server, baseUrl } = await listen(app);

  // Ten people signing in from one office address must all get through.
  for (let i = 0; i < 10; i++) {
    assert.equal(await post(baseUrl), 200, `sign-in ${i + 1} should succeed`);
  }

  server.close();
});

test('a limiter without the refund counts every request', async () => {
  const app = build(
    { windowMs: 60000, max: 2 },
    (req, res) => res.status(200).json({ success: true })
  );
  const { server, baseUrl } = await listen(app);

  assert.equal(await post(baseUrl), 200);
  assert.equal(await post(baseUrl), 200);
  assert.equal(await post(baseUrl), 429);

  server.close();
});

test('a blocked response carries Retry-After so clients can back off', async () => {
  const app = build(
    { windowMs: 60000, max: 1, skipSuccessful: true },
    (req, res) => res.status(400).json({ message: 'wrong password' })
  );
  const { server, baseUrl } = await listen(app);

  await post(baseUrl);
  const headers = await new Promise((resolve) => {
    const req = http.request(`${baseUrl}/try`, { method: 'POST' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.headers));
    });
    req.end();
  });

  assert.ok(Number(headers['retry-after']) > 0);
  assert.equal(headers['ratelimit-remaining'], '0');

  server.close();
});
