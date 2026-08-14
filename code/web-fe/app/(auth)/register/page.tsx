import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = { title: 'Create Account' };

export default function RegisterPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-text">Create an account</h1>
          <p className="text-text-muted mt-2">Join Declay and start collecting</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <RegisterClient />
        </div>
      </div>
    </div>
  );
}
