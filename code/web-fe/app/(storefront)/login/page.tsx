import type { Metadata } from 'next';
import LoginClient from './LoginClient';
import OAuthErrorBanner from './OAuthErrorBanner';

export const metadata: Metadata = { title: 'Log In' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-text">Welcome back</h1>
          <p className="text-text-muted mt-2">Log in to your Declay account</p>
        </div>
        {error === 'oauth_failed' && <OAuthErrorBanner />}
        <div className="bg-surface border border-border rounded-2xl p-8">
          <LoginClient />
        </div>
      </div>
    </div>
  );
}
