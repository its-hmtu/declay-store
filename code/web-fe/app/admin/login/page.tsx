import type { Metadata } from 'next';
import AdminLoginClient from './AdminLoginClient';

export const metadata: Metadata = { title: 'Admin Login' };

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-brand flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white">Declay Admin</h1>
          <p className="text-white/60 mt-2 text-sm">Sign in to the dashboard</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <AdminLoginClient />
        </div>
      </div>
    </div>
  );
}
