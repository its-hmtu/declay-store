import { redirect } from 'next/navigation';

export const metadata = { title: 'My Profile' };

export default function AccountPage() {
  redirect('/account/profile');
}
