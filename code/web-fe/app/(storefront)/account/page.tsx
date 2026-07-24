import type { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = { title: 'My Profile' };

export default function AccountPage() {
  return <AccountClient />;
}
