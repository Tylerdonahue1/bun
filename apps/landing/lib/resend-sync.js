// After a lead is stored: optionally upsert a Resend contact, then send the welcome note.
// Both are off unless their flags are exactly "true". Failures are logged and never thrown.
import { Resend } from 'resend';
import { FROM, LIST_UNSUBSCRIBE_HEADERS, renderWelcome, welcomeIdempotencyKey } from './welcome-email.js';

const on = name => process.env[name] === 'true';

export function resendPlan(lead) {
  if (lead?.unsafe) return { contacts: false, email: false, reason: 'unsafe' };
  const allowTest = on('WELCOME_EMAIL_ALLOW_TEST');
  if (lead?.is_test && !allowTest) return { contacts: false, email: false, reason: 'test' };
  return {
    contacts: on('RESEND_CONTACTS_ENABLED'),
    email: on('WELCOME_EMAIL_ENABLED'),
    reason: 'flags',
  };
}

function alreadyThere(error) {
  if (!error) return false;
  if (error.name === 'restricted_api_key' || error.name === 'missing_api_key' || error.name === 'invalid_api_key') return false;
  const message = String(error.message || '').toLowerCase();
  return error.statusCode === 409 || message.includes('already exist') || message.includes('duplicate');
}

async function upsertContact(contacts, { email, firstName, segmentId }) {
  const created = await contacts.create({
    email,
    ...(firstName ? { firstName } : {}),
    unsubscribed: false,
    segments: [{ id: segmentId }],
  });
  if (!created.error) return;
  if (!alreadyThere(created.error)) throw new Error(created.error.message || 'contact create failed');
  if (firstName) {
    const updated = await contacts.update({ email, firstName });
    if (updated.error) throw new Error(updated.error.message || 'contact update failed');
  }
  const added = await contacts.segments.add({ email, segmentId });
  if (added.error && !alreadyThere(added.error)) throw new Error(added.error.message || 'segment add failed');
}

function logFailure(kind, email, error) {
  console.error(`resend ${kind} failed`, email, String(error && error.message || error).slice(0, 300));
}

export async function deliverLead(lead, deps = {}) {
  const plan = resendPlan(lead);
  if (!plan.contacts && !plan.email) return plan;

  if (plan.contacts) {
    const segmentId = process.env.RESEND_AUDIENCE_ID || '';
    const contacts = deps.contacts || (process.env.RESEND_CONTACTS_API_KEY ? new Resend(process.env.RESEND_CONTACTS_API_KEY).contacts : null);
    if (!contacts || !segmentId) logFailure('contact', lead.email, new Error('RESEND_CONTACTS_API_KEY and RESEND_AUDIENCE_ID are required'));
    else {
      try {
        await upsertContact(contacts, { email: lead.email, firstName: lead.first_name || '', segmentId });
      } catch (error) {
        logFailure('contact', lead.email, error);
      }
    }
  }

  if (plan.email) {
    const emails = deps.emails || (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY).emails : null);
    if (!emails) logFailure('welcome', lead.email, new Error('RESEND_API_KEY is required'));
    else {
      try {
        const message = await renderWelcome({ firstName: lead.first_name, resultType: lead.result_type, bunSrc: deps.bunSrc });
        const sent = await emails.send({
          from: FROM,
          to: [lead.email],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: LIST_UNSUBSCRIBE_HEADERS,
        }, { idempotencyKey: welcomeIdempotencyKey(lead.email) });
        if (sent.error) throw new Error(sent.error.message || 'welcome send failed');
      } catch (error) {
        logFailure('welcome', lead.email, error);
      }
    }
  }
  return plan;
}
