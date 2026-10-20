// Login input validation. The model is stubbed, so no database is needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const User = require('../models/User');

let lastFilter = null;
User.findOne = async (filter) => { lastFilter = filter; return null; };

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

let server;
let baseUrl;
test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (body) => new Promise((resolve) => {
  const data = JSON.stringify(body);
  const req = http.request(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  req.end(data);
});

// {"$ne": null} as the email used to reach User.findOne as a query operator,
// matching the first account in the collection, so its password could be
// guessed without knowing whose account it was.
test('an object as the email is rejected before any lookup', async () => {
  lastFilter = null;
  assert.equal(await post({ email: { $ne: null }, password: 'guess1234' }), 400);
  assert.equal(lastFilter, null, 'User.findOne was reached with an operator object');
});

test('a non-string password is rejected with 400, not a 500 from bcrypt', async () => {
  assert.equal(await post({ email: 'a@b.tn', password: { $gt: '' } }), 400);
  assert.equal(await post({ email: 'a@b.tn', password: 12345678 }), 400);
});

test('a normal unknown login still answers 400', async () => {
  lastFilter = null;
  assert.equal(await post({ email: 'nobody@rms.tn', password: 'whatever1' }), 400);
  assert.deepEqual(lastFilter, { email: 'nobody@rms.tn' });
});
