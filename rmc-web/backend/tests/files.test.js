// Access-control tests for the stored-file route, which replaced an
// express.static mount that served every uploaded file to anyone with a URL.
// The model layer is stubbed so no database is needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'x'.repeat(48);

const User = require('../models/User');
const CongeRequest = require('../models/CongeRequest');
const Expense = require('../models/Expense');
const AccessRequest = require('../models/AccessRequest');
const { uploadsRoot, ensureUploadDirs } = require('../config/uploadDirs');

// Controlled by each test.
let currentUser = null;
let ownsRecord = false;

User.findById = () => ({ select: async () => currentUser });
User.exists = async () => (ownsRecord ? { _id: 'u1' } : null);
CongeRequest.exists = async () => (ownsRecord ? { _id: 'c1' } : null);
Expense.exists = async () => (ownsRecord ? { _id: 'e1' } : null);
AccessRequest.exists = async () => (ownsRecord ? { _id: 'a1' } : null);

const app = express();
app.use('/uploads', require('../routes/files'));

const token = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET);

// A real file to request, so a 200 is genuinely reachable.
ensureUploadDirs();
const sampleName = 'access-control-fixture.txt';
const samplePath = path.join(uploadsRoot, 'clients', sampleName);
fs.writeFileSync(samplePath, 'fixture');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  try { fs.unlinkSync(samplePath); } catch { /* already gone */ }
});

const request = (urlPath, withToken = true) =>
  new Promise((resolve) => {
    const headers = withToken ? { Authorization: `Bearer ${token}` } : {};
    http.get(`${baseUrl}${urlPath}`, { headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
  });

test('a stored file cannot be read without a session', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  assert.equal(await request(`/uploads/clients/${sampleName}`, false), 401);
});

test('a forged token is rejected', async () => {
  const bad = new Promise((resolve) => {
    http.get(`${baseUrl}/uploads/clients/${sampleName}`,
      { headers: { Authorization: 'Bearer not-a-real-token' } },
      (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  });
  assert.equal(await bad, 401);
});

test('client attachments are readable by any signed-in role', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  assert.equal(await request(`/uploads/clients/${sampleName}`), 200);
});

test('path traversal cannot escape the uploads directory', async () => {
  currentUser = { _id: 'u1', role: 'admin', cin: 'X1' };
  for (const attempt of ['/uploads/../.env', '/uploads/%2e%2e%2f.env', '/uploads/a/b/../../../.env']) {
    const status = await request(attempt);
    assert.notEqual(status, 200, `traversal succeeded for ${attempt}`);
  }
});

test('a category with no rule is denied rather than served', async () => {
  currentUser = { _id: 'u1', role: 'admin', cin: 'X1' };
  assert.equal(await request('/uploads/unknown-category/x.txt'), 403);
});

test('personal files are refused to a non-owner', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  ownsRecord = false;
  assert.equal(await request('/uploads/employees/cin/other.png'), 403);
  assert.equal(await request('/uploads/factures/other.jpg'), 403);
  assert.equal(await request('/uploads/conge/other.jpg'), 403);
  assert.equal(await request('/uploads/documents/other.docx'), 403);
});

test('an owner gets past authorisation and only then hits a missing file', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  ownsRecord = true;
  assert.equal(await request('/uploads/employees/cin/mine.png'), 404);
  assert.equal(await request('/uploads/factures/mine.jpg'), 404);
});

test('accounting may read receipts but not identity scans', async () => {
  currentUser = { _id: 'u3', role: 'comptable', cin: 'X3' };
  ownsRecord = false;
  assert.equal(await request('/uploads/employees/cin/other.png'), 403);
  assert.equal(await request('/uploads/factures/other.jpg'), 404);
});

test('authorisation is decided before existence, so 403 does not leak filenames', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  ownsRecord = false;
  // Both of these files are absent. An unauthorised caller must not be able to
  // tell them apart from ones that exist.
  assert.equal(await request('/uploads/employees/cin/absent-a.png'), 403);
  assert.equal(await request('/uploads/employees/cin/absent-b.png'), 403);
});

test('stored files are served with hardening headers', async () => {
  currentUser = { _id: 'u1', role: 'employer', cin: 'X1' };
  const headers = await new Promise((resolve) => {
    http.get(`${baseUrl}/uploads/clients/${sampleName}`,
      { headers: { Authorization: `Bearer ${token}` } },
      (res) => { res.resume(); res.on('end', () => resolve(res.headers)); });
  });
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.match(headers['cache-control'], /no-store/);
});
