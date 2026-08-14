import type { Metadata } from 'next';
import InboxClient from './InboxClient';

export const metadata: Metadata = { title: 'Inbox — Declay Admin' };

export default function AdminInboxPage() {
  return <InboxClient />;
}
