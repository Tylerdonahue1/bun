// Welcome email copy + HTML. Rendered at send time (no email build step).
// Result blurbs come from lib/quiz.js so the note matches the page.
import React from 'react';
import { Body, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components';
import { render } from '@react-email/render';
import { TYPES } from './quiz.js';

const h = React.createElement;
export const FROM = 'Bun from Simmer <hello@bun.coach>';
export const BUN_IMAGE_URL = 'https://bun.coach/email/bun.png';
export const UNSUBSCRIBE_URL = '{{{RESEND_UNSUBSCRIBE_URL}}}';
export const QUIZ_URL = 'https://bun.coach';

function shortName(resultType) {
  const type = TYPES[resultType];
  return type ? type.name.replace(/^The /, '') : '';
}

export function subjectFor(resultType) {
  const short = shortName(resultType);
  if (!short) return 'You’re on the Bun list';
  const article = /^[aeiou]/i.test(short) ? 'an' : 'a';
  return `You’re ${article} ${short} (here’s what that means)`;
}

export function welcomeIdempotencyKey(email) {
  return `welcome-email/${String(email || '').trim().toLowerCase()}`;
}

function greeting(firstName) {
  const name = String(firstName || '').trim();
  return name ? `Hi ${name},` : 'Hi,';
}

export function welcomeParts({ firstName, resultType } = {}) {
  const type = TYPES[resultType] || null;
  const subject = subjectFor(resultType);
  const hello = greeting(firstName);
  const result = type ? {
    name: shortName(resultType),
    fullName: type.name,
    emoji: type.emoji,
    tag: type.tag,
    insight: type.insight,
    tip: type.tonight,
  } : null;
  const preview = result
    ? result.tag
    : 'You’re on the early-access list. Bun will write when Simmer is ready.';
  return { subject, preview, hello, result };
}

const SAFETY = 'Simmer is relationship coaching, not therapy, and not for emergencies. If you ever feel unsafe, call or text 988, or the National Domestic Violence Hotline at 1-800-799-7233 (text START to 88788). If you’re in danger right now, call 911.';

export function welcomeText(props = {}) {
  const { subject, hello, result } = welcomeParts(props);
  const lines = [hello, ''];
  if (result) {
    lines.push(`You two are ${/^[aeiou]/i.test(result.name) ? 'an' : 'a'} ${result.name}.`, '', result.tag, '', result.insight, '', 'For the next fight', result.tip, '');
  } else {
    lines.push('You’re on the list. Whenever you want a read on how the two of you fight, the quiz is one minute at bun.coach.', '');
  }
  lines.push(
    'What Bun is',
    'Bun is a warm little AI coach that helps couples cool down, hear each other, and repair. Bun never picks a side, and never says “calm down.” This is coaching, not therapy.',
    '',
    'What happens next',
    'You’re on the early-access list for Simmer. When it’s ready, we’ll write to this address. Nothing to pay today. Fight mode stays free.',
    '',
    'If you want your partner in on it, forward this note. The quiz is one minute: ' + QUIZ_URL,
    '',
    'With care,',
    'Bun',
    '',
    '---',
    SAFETY,
    '',
    'You’re getting this because you asked to hear from Bun at bun.coach.',
    'Unsubscribe: ' + UNSUBSCRIBE_URL,
  );
  return { subject, text: lines.join('\n') };
}

const ink = '#2B1A12';
const muted = '#5E4334';
const cream = '#FFF4E6';
const card = '#FFFBF5';
const tomato = '#B8361C';
const butter = '#F6C453';

function emailElement(props) {
  const { preview, hello, result } = welcomeParts(props);
  const bunSrc = props.bunSrc || BUN_IMAGE_URL;
  return h(Html, { lang: 'en' },
    h(Head, null,
      h('meta', { name: 'color-scheme', content: 'light dark' }),
      h('meta', { name: 'supported-color-schemes', content: 'light dark' }),
      h('style', null, `
        :root { color-scheme: light dark; }
        @media (prefers-color-scheme: dark) {
          .bg { background-color: #2B1A12 !important; }
          .card { background-color: #3D291F !important; border-color: #F6C453 !important; }
          .ink { color: #FFF4E6 !important; }
          .muted { color: #F6D7C3 !important; }
          .tip { background-color: #4A3424 !important; }
          .rule { border-color: #6B4A38 !important; }
        }
      `),
    ),
    h(Body, { className: 'bg', style: { margin: 0, backgroundColor: cream, fontFamily: 'Figtree, "Segoe UI", Helvetica, Arial, sans-serif', color: ink } },
      h(Preview, null, preview),
      h(Container, { className: 'bg', style: { maxWidth: '560px', margin: '0 auto', padding: '28px 20px 36px' } },
        h(Section, { style: { textAlign: 'center', paddingBottom: '8px' } },
          h(Img, { src: bunSrc, alt: 'Bun, a round yellow dumpling with a small smile', width: '96', height: '84' }),
          h(Text, { className: 'muted', style: { margin: '10px 0 0', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: tomato } }, 'Simmer · with Bun'),
        ),
        h(Heading, { as: 'h1', className: 'ink', style: { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '32px', lineHeight: '1.15', fontWeight: 700, color: ink, margin: '8px 0 8px' } },
          result ? `You’re ${/^[aeiou]/i.test(result.name) ? 'an' : 'a'} ${result.name}` : 'You’re on the list',
        ),
        result ? h(Text, { className: 'ink', style: { fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '18px', lineHeight: '1.35', color: tomato, margin: '0 0 16px' } }, result.tag) : null,
        h(Text, { className: 'ink', style: textStyle }, hello),
        result
          ? h(Text, { className: 'ink', style: textStyle }, result.insight)
          : h(Text, { className: 'ink', style: textStyle }, 'Whenever you want a read on how the two of you fight, the quiz is one minute. No account, no lecture.'),
        result ? h(Section, { className: 'tip card', style: { backgroundColor: butter, border: '2px solid #2B1A12', borderRadius: '16px', padding: '14px 16px', margin: '8px 0 18px' } },
          h(Text, { className: 'ink', style: { margin: '0 0 6px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink } }, 'For the next fight'),
          h(Text, { className: 'ink', style: { margin: 0, fontSize: '16px', lineHeight: '1.45', color: ink } }, result.tip),
        ) : null,
        h(Heading, { as: 'h2', className: 'ink', style: h2 }, 'What Bun is'),
        h(Text, { className: 'ink', style: textStyle }, 'Bun is a warm little AI coach that helps couples cool down, hear each other, and repair. Bun never picks a side, and never says “calm down.” This is coaching, not therapy.'),
        h(Heading, { as: 'h2', className: 'ink', style: h2 }, 'What happens next'),
        h(Text, { className: 'ink', style: textStyle }, 'You’re on the early-access list for Simmer. When it’s ready, we’ll write to this address. Nothing to pay today. Fight mode stays free.'),
        h(Heading, { as: 'h2', className: 'ink', style: h2 }, 'Your partner'),
        h(Text, { className: 'ink', style: textStyle }, 'Forward this note if you want them in on it. The quiz takes a minute.'),
        h(Section, { style: { textAlign: 'center', padding: '4px 0 8px' } },
          h(Link, { href: QUIZ_URL, style: { display: 'inline-block', backgroundColor: tomato, color: '#ffffff', fontWeight: 700, textDecoration: 'none', borderRadius: '999px', padding: '12px 22px' } }, 'Take the quiz together'),
        ),
        h(Text, { className: 'ink', style: textStyle }, 'With care,'),
        h(Text, { className: 'ink', style: { ...textStyle, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '20px', marginTop: 0 } }, 'Bun'),
        h(Hr, { className: 'rule', style: { borderColor: '#E7D3C0', borderTop: '1px solid #E7D3C0', margin: '20px 0' } }),
        h(Text, { className: 'muted', style: fine }, SAFETY),
        h(Text, { className: 'muted', style: fine }, 'You’re getting this because you asked to hear from Bun at bun.coach.'),
        h(Text, { className: 'muted', style: fine },
          h(Link, { href: UNSUBSCRIBE_URL, style: { color: muted } }, 'Unsubscribe'),
        ),
      ),
    ),
  );
}

const textStyle = { fontSize: '16px', lineHeight: '1.5', color: ink, margin: '0 0 14px' };
const h2 = { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '22px', lineHeight: '1.2', color: ink, margin: '18px 0 8px' };
const fine = { fontSize: '13px', lineHeight: '1.45', color: muted, margin: '0 0 10px' };

export function welcomeElement(props = {}) {
  return emailElement(props);
}

export async function renderWelcome(props = {}) {
  const { subject, text } = welcomeText(props);
  const html = await render(emailElement(props));
  return { subject, text, html };
}

export const LIST_UNSUBSCRIBE_HEADERS = {
  'List-Unsubscribe': `<${UNSUBSCRIBE_URL}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};
