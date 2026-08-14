/**
 * M-42: out-of-hours fallback for live chat.
 *
 * The whole point of the human handoff is that a customer never hits a dead end.
 * When nobody is watching the inbox, the conversation would silently rot — so we
 * email the staff so somebody picks it up, and (if the customer left an address)
 * tell the customer their message landed rather than vanished.
 *
 * Both sends are best-effort: a mail failure must not roll back the handoff. The
 * conversation is already queued in the database either way.
 */
import config from '@/config/env';
import { logger } from '@/lib/logger';
import { sendCustomerNotice } from '@/lib/email';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';
import { ChatMessage, type ChatSession } from '@/modules/chat/chat.entity';

/** Enough context in the email that staff can triage without opening the inbox. */
const TRANSCRIPT_PREVIEW = 6;

export async function sendHandoffNotification(session: ChatSession): Promise<void> {
  const [staffEmails, preview] = await Promise.all([
    activeStaffEmails(),
    recentTranscript(session.id),
  ]);

  const inboxUrl = `${config.oauth.frontendUrl}/admin/inbox?session=${session.id}`;
  const who = session.guestName || (session.userId ? `Customer #${session.userId}` : 'A guest');

  if (staffEmails.length) {
    await sendCustomerNotice(
      staffEmails.join(','),
      `[Declay] ${who} is waiting in chat`,
      `
        <p><strong>${escapeHtml(who)}</strong> asked to speak to someone while nobody was online.</p>
        ${session.handoffReason ? `<p>Reason: ${escapeHtml(session.handoffReason)}</p>` : ''}
        ${session.guestEmail ? `<p>Reply-to: ${escapeHtml(session.guestEmail)}</p>` : '<p><em>No email left — reply in the inbox.</em></p>'}
        <p style="margin-top:16px"><strong>Last messages:</strong></p>
        <div style="border-left:3px solid #ddd;padding-left:12px;color:#444">${preview}</div>
        <p style="margin-top:16px"><a href="${inboxUrl}">Open in the staff inbox</a></p>
      `,
    ).catch((err) => logger.warn('staff handoff email failed', { sessionId: session.id, error: String(err) }));
  } else {
    // Worth a loud log: a queued customer with nobody to notify is a silent failure.
    logger.warn('Chat handoff queued but no active staff email found', { sessionId: session.id });
  }

  if (session.guestEmail) {
    await sendCustomerNotice(
      session.guestEmail,
      'We received your message',
      `<p>Thanks for reaching out. Nobody was available at that moment, but your message is with our team and we will reply to this address.</p>`,
    ).catch((err) => logger.warn('customer ack email failed', { sessionId: session.id, error: String(err) }));
  }
}

async function activeStaffEmails(): Promise<string[]> {
  const admins = await AdminUser.findAll({
    where: { isActive: true },
    attributes: ['email'],
    limit: 20,
  });
  return admins.map((a) => a.email).filter(Boolean);
}

async function recentTranscript(sessionId: number): Promise<string> {
  const rows = await ChatMessage.findAll({
    where: { sessionId },
    order: [['createdAt', 'DESC']],
    limit: TRANSCRIPT_PREVIEW,
  });

  if (!rows.length) return '<p><em>No messages yet.</em></p>';

  return rows
    .reverse()
    .map((m) => {
      const label = m.role === 'user' ? 'Customer' : m.role === 'staff' ? (m.authorName ?? 'Staff') : 'Assistant';
      return `<p style="margin:4px 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(m.content.slice(0, 300))}</p>`;
    })
    .join('');
}

/** Customer text goes into an HTML email — escape it. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
