'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { motion } from 'motion/react';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { useToast } from '@/hooks/useToast';

// ─── Shared styles ────────────────────────────────────────────────────────────

const glassPanelStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow-lg)',
  borderRadius: '28px',
  padding: '32px 28px',
};

const glassInputStyle: React.CSSProperties = {
  backgroundColor: 'var(--glass-input-bg)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--glass-input-border)',
  borderRadius: '14px',
  padding: '12px 14px',
  minHeight: '48px',
  fontSize: '15px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--color-text-secondary)" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="var(--color-text-secondary)" strokeWidth="2" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const OnboardingPage = () => {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { toast } = useToast();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailBlur = () => {
    if (emailAddress.trim().length > 0 && !validateEmail(emailAddress)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const isFormValid = validateEmail(emailAddress) && password.trim().length > 0;
  const isButtonDisabled = loading || !isFormValid || oauthLoading !== null;

  const handleSignIn = async () => {
    if (!isLoaded || !emailAddress || !password) return;
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: emailAddress, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.push('/');
      } else {
        toast.error('Unable to sign in. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    try {
      setOauthLoading('google');
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Failed to sign in with Google');
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isLoaded) return;
    try {
      setOauthLoading('apple');
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Failed to sign in with Apple');
      setOauthLoading(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isButtonDisabled) handleSignIn();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-y-auto"
      style={{
        background: 'var(--glass-page-bg)',
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
        paddingTop: 'max(40px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm" style={{ marginTop: '8px', marginBottom: '8px' }}>

        {/* App brand */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
          >
            TolKI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Real-time voice interpretation
          </p>
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={glassPanelStyle}
        >
          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Sign in to continue translating
            </p>
          </div>

          {/* Social auth — Google + Apple */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading || oauthLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 font-medium transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                ...glassInputStyle,
                minHeight: '52px',
                borderRadius: '16px',
                opacity: oauthLoading !== null && oauthLoading !== 'google' ? 0.5 : 1,
                cursor: loading || oauthLoading !== null ? 'not-allowed' : 'pointer',
              }}
              aria-label="Continue with Google"
            >
              {oauthLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>Google</span>
                </>
              )}
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={loading || oauthLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 font-medium transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                ...glassInputStyle,
                minHeight: '52px',
                borderRadius: '16px',
                opacity: oauthLoading !== null && oauthLoading !== 'apple' ? 0.5 : 1,
                cursor: loading || oauthLoading !== null ? 'not-allowed' : 'pointer',
              }}
              aria-label="Continue with Apple"
            >
              {oauthLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-text-primary)" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zm-2.88-16c-.73.83-1.94 1.46-2.94 1.42-.15-1.15.41-2.35 1.05-3.11.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.05 3.19z" />
                  </svg>
                  <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>Apple</span>
                </>
              )}
            </button>
          </div>

          <AuthDivider />

          {/* Email field */}
          <div style={{ marginTop: '20px', marginBottom: '16px' }}>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase"
              style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
              htmlFor="login-email"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={emailAddress}
              onChange={(e) => { setEmailAddress(e.target.value); setEmailError(null); }}
              onBlur={handleEmailBlur}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
              style={{
                ...glassInputStyle,
                borderColor: emailError ? 'var(--color-error)' : undefined,
              }}
            />
            {emailError && (
              <p className="text-xs mt-1 ml-1" style={{ color: 'var(--color-error)' }}>{emailError}</p>
            )}
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '20px' }}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
                htmlFor="login-password"
              >
                Password
              </label>
              <button
                onClick={() => router.push('/forgot-password')}
                disabled={loading}
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                style={{ ...glassInputStyle, paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          {/* Sign In CTA */}
          <motion.button
            onClick={handleSignIn}
            disabled={isButtonDisabled}
            whileTap={{ scale: isButtonDisabled ? 1 : 0.97 }}
            className="w-full font-semibold transition-all"
            style={{
              background: isButtonDisabled
                ? 'var(--color-neutral-300)'
                : 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
              color: isButtonDisabled ? 'var(--color-text-tertiary)' : 'white',
              opacity: isButtonDisabled ? 0.6 : 1,
              minHeight: '52px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
              boxShadow: !isButtonDisabled ? '0 8px 24px rgba(37, 99, 235, 0.3)' : 'none',
              marginBottom: '20px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>

          {/* Sign up link */}
          <div className="flex items-center justify-center gap-1">
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              New here?
            </span>
            <button
              onClick={() => router.push('/sign-up')}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary)', fontSize: '14px' }}
            >
              Create an account
            </button>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        input::placeholder {
          color: var(--color-text-tertiary);
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default OnboardingPage;
