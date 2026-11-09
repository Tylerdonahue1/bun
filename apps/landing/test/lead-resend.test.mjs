import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, TYPES } from '../lib/quiz.js';
import { handleLead } from '../api/lead.js';
import { deliverLead } from '../lib/resend-sync.js';
import { renderWelcome, subjectFor, welcomeIdempotencyKey, welcomeText, UNSUBSCRIBE_URL } from '../lib/welcome-email.js';

const answersFor = ids => Object.fromEntries(QUESTIONS.map((q, i) => [q.id, ids[i]]));
const SIMMER = answersFor(['lawyer', 'dishes', 'night', 'neither', 'drop', 'sleep', 'same', 'loud']);
const FLASH = answersFor(['volcano', 'tone', 'car', 'now', 'makeup', 'minutes', 'new', 'no']);
const UNSAFE = answersFor(['volcano', 'tone', 'car', 'now', 'makeup', 'minutes', 'new', 'yes']);

function res() {
  return { statusCode: 0, body: '', setHeader() {}, end(body) { this.body = body; } };
}
function req(body, ip = '203.0.113.10') {
  return { method: 'POST', headers: { 'x-forwarded-for': ip }, body };
}
const savedEnv = {};
function setEnv(values) {
  for (const key of ['WELCOME_EMAIL_ENABLED', 'RESEND_CONTACTS_ENABLED', 'WELCOME_EMAIL_ALLOW_TEST', 'RESEND_AUDIENCE_ID', 'RESEND_API_KEY', 'RESEND_CONTACTS_API_KEY']) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}
test.after(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function clients() {
  const calls = { create: [], update: [], add: [], send: [] };
  return {
    calls,
    contacts: {
      async create(payload) { calls.create.push(payload); return { data: { id: 'contact_1' }, error: null }; },
      async update(payload) { calls.update.push(payload); return { data: { id: 'contact_1' }, error: null }; },
      segments: { async add(payload) { calls.add.push(payload); return { data: { id: 'contact_1' }, error: null }; } },
    },
    emails: {
      async send(payload, options) { calls.send.push({ payload, options }); return { data: { id: 'email_1' }, error: null }; },
    },
  };
}

const lead = {
  email: 'jordan@example.com',
  first_name: 'Jordan',
  result_type: 'simmer',
  is_test: false,
};

test('flags off: no Resend calls', async () => {
  setEnv({});
  const fake = clients();
  const plan = await deliverLead(lead, fake);
  assert.equal(plan.contacts, false);
  assert.equal(plan.email, false);
  assert.equal(fake.calls.create.length, 0);
  assert.equal(fake.calls.send.length, 0);
});

test('flags on: upserts the contact into the segment, then sends one welcome', async () => {
  setEnv({ WELCOME_EMAIL_ENABLED: 'true', RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: '47aa185f-cccb-4226-b99a-770bac7f26ca' });
  const fake = clients();
  await deliverLead(lead, fake);
  assert.equal(fake.calls.create.length, 1);
  assert.equal(fake.calls.create[0].email, 'jordan@example.com');
  assert.equal(fake.calls.create[0].firstName, 'Jordan');
  assert.deepEqual(fake.calls.create[0].segments, [{ id: '47aa185f-cccb-4226-b99a-770bac7f26ca' }]);
  assert.equal(fake.calls.send.length, 1);
  assert.equal(fake.calls.send[0].payload.from, 'Bun from Simmer <hello@bun.coach>');
  assert.deepEqual(fake.calls.send[0].payload.to, ['jordan@example.com']);
  assert.equal(fake.calls.send[0].payload.subject, 'You’re a Slow Simmer (here’s what that means)');
  assert.match(fake.calls.send[0].payload.text, /For the next fight/);
  assert.match(fake.calls.send[0].payload.html, /Unsubscribe/);
  assert.equal(fake.calls.send[0].options.idempotencyKey, 'welcome-email/jordan@example.com');
  assert.match(fake.calls.send[0].payload.headers['List-Unsubscribe'], /RESEND_UNSUBSCRIBE_URL/);
});

test('existing contact is updated and added to the segment', async () => {
  setEnv({ RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: 'seg_waitlist' });
  const fake = clients();
  fake.contacts.create = async () => ({ data: null, error: { message: 'Contact already exists', statusCode: 409, name: 'validation_error' } });
  await deliverLead({ ...lead, email: 'ada@example.com' }, { contacts: fake.contacts });
  assert.equal(fake.calls.update.length, 1);
  assert.equal(fake.calls.update[0].email, 'ada@example.com');
  assert.deepEqual(fake.calls.add[0], { email: 'ada@example.com', segmentId: 'seg_waitlist' });
  assert.equal(fake.calls.send.length, 0);
});

test('a Resend failure does not throw', async () => {
  setEnv({ WELCOME_EMAIL_ENABLED: 'true', RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: 'seg_waitlist' });
  const fake = clients();
  fake.contacts.create = async () => { throw new Error('network down'); };
  fake.emails.send = async () => ({ data: null, error: { message: 'domain not verified', name: 'validation_error' } });
  await assert.doesNotReject(() => deliverLead(lead, fake));
});

test('test leads are skipped unless the allow flag is on', async () => {
  setEnv({ WELCOME_EMAIL_ENABLED: 'true', RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: 'seg_waitlist' });
  const fake = clients();
  const testLead = { ...lead, email: 'test+bun@example.com', is_test: true };
  await deliverLead(testLead, fake);
  assert.equal(fake.calls.send.length, 0);
  assert.equal(fake.calls.create.length, 0);
  setEnv({ WELCOME_EMAIL_ENABLED: 'true', RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: 'seg_waitlist', WELCOME_EMAIL_ALLOW_TEST: 'true' });
  await deliverLead(testLead, fake);
  assert.equal(fake.calls.send.length, 1);
  assert.equal(fake.calls.create.length, 1);
});

test('safety answers are not stored and not emailed', async () => {
  setEnv({ WELCOME_EMAIL_ENABLED: 'true', RESEND_CONTACTS_ENABLED: 'true', RESEND_AUDIENCE_ID: 'seg_waitlist' });
  const stored = [];
  const delivered = [];
  const out = res();
  await handleLead(req({ email: 'ada@example.com', consent: true, answers: UNSAFE, elapsedMs: 9000 }, '203.0.113.21'), out, {
    store: async (lead) => { stored.push(lead); },
    deliver: async (lead) => { delivered.push(lead); },
  });
  assert.equal(out.statusCode, 200);
  assert.equal(stored.length, 0);
  assert.equal(delivered.length, 0);
});

test('signup still succeeds when delivery throws', async () => {
  const stored = [];
  const out = res();
  await handleLead(req({ email: 'sam@example.com', firstName: 'Sam', consent: true, answers: SIMMER, elapsedMs: 9000 }, '203.0.113.22'), out, {
    store: async (row) => { stored.push(row); },
    deliver: async () => { throw new Error('resend down'); },
  });
  assert.equal(out.statusCode, 200);
  assert.equal(JSON.parse(out.body).type, 'simmer');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].email, 'sam@example.com');
});

test('welcome copy uses the quiz descriptions and stays free of invented proof', async () => {
  for (const key of Object.keys(TYPES)) {
    const { subject, text } = welcomeText({ firstName: 'Jordan', resultType: key });
    assert.equal(subject, subjectFor(key));
    assert.match(text, /Jordan/);
    assert.match(text, new RegExp(TYPES[key].tonight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(text, /988/);
    assert.match(text, /1-800-799-7233/);
    assert.match(text, /not therapy/);
    assert.match(text, new RegExp(UNSUBSCRIBE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(text.includes('$141'), false);
    assert.equal(/testimonial|%\sof couples/i.test(text), false);
  }
  assert.equal(subjectFor('souffle'), `You’re an ${TYPES.souffle.name.replace(/^The /, '')} (here’s what that means)`);
  assert.equal(welcomeIdempotencyKey('Jordan@Example.com'), 'welcome-email/jordan@example.com');
  const rendered = await renderWelcome({ firstName: 'Jordan', resultType: 'flash', bunSrc: 'https://bun.coach/email/bun.png' });
  assert.match(rendered.html, /Flash Fry/);
  assert.match(rendered.html, /bun\.png/);
  assert.match(rendered.html, /prefers-color-scheme: dark/);
  assert.equal(rendered.subject, subjectFor('flash'));
});
