export default function OAuthErrorBanner() {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
      Google sign-in failed. Please try again or use email and password.
    </div>
  );
}
