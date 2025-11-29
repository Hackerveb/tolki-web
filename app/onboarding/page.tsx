'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { useToast } from '@/hooks/useToast';
import { colors } from '@/styles/colors';

const OnboardingPage = () => {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { toast } = useToast();

  // Sign-in form state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Email validation
  const validateEmail = (email: string): { isValid: boolean; message?: string } => {
    if (!email) return { isValid: false, message: 'Email is required' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true };
  };

  const handleEmailBlur = () => {
    if (emailAddress.trim().length > 0) {
      const validation = validateEmail(emailAddress);
      setEmailError(validation.isValid ? null : validation.message || 'Invalid email');
    }
  };

  const handleEmailFocus = () => {
    setEmailError(null);
  };

  const emailValidation = validateEmail(emailAddress);
  const isFormValid = emailValidation.isValid && password.trim().length > 0;
  const isButtonDisabled = loading || !isFormValid || oauthLoading !== null;

  const handleSignInPress = async () => {
    if (!isLoaded) return;

    if (!emailAddress || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push('/');
      } else {
        toast.error('Unable to sign in. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid email or password';
      toast.error(errorMessage);
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

  const handleSignUpLink = () => {
    router.push('/sign-up');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'var(--color-background)',
        padding: 'max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand & Value Proposition */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: colors.primary,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                  fill="var(--color-on-primary)"
                />
              </svg>
            </div>
          </div>

          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Welcome to TolKI
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Real-time voice translation in 58 languages
          </p>
        </div>

        {/* Sign In Card */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Email Input */}
          <div className="mb-4">
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Email
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              onBlur={handleEmailBlur}
              onFocus={handleEmailFocus}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                boxShadow: 'var(--shadow-inner)',
                border: emailError ? `1px solid ${colors.error}` : '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {emailError && (
              <p className="text-xs mt-1.5" style={{ color: colors.error }}>
                {emailError}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className="w-full"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  boxShadow: 'var(--shadow-inner)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px 44px 12px 14px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {/* Password visibility toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-70"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                      stroke="var(--color-text-tertiary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--color-text-tertiary)" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="var(--color-text-tertiary)" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={() => router.push('/forgot-password')}
              disabled={loading}
              className="text-xs font-medium mt-2 hover:underline"
              style={{ color: colors.primary }}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignInPress}
            disabled={isButtonDisabled}
            className="w-full font-medium transition-all"
            style={{
              backgroundColor: isButtonDisabled ? 'var(--color-neutral-300)' : colors.primary,
              color: 'var(--color-on-primary)',
              opacity: isButtonDisabled ? 0.6 : 1,
              minHeight: '44px',
              borderRadius: '8px',
              fontSize: '14px',
              boxShadow: !isButtonDisabled ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="my-5">
            <AuthDivider />
          </div>

          {/* Social Auth Buttons */}
          <div className="flex items-center justify-center gap-3">
            <SocialAuthButton
              provider="google"
              onPress={handleGoogleSignIn}
              disabled={loading || oauthLoading !== null}
              loading={oauthLoading === 'google'}
              iconOnly
            />
            <SocialAuthButton
              provider="apple"
              onPress={handleAppleSignIn}
              disabled={loading || oauthLoading !== null}
              loading={oauthLoading === 'apple'}
              iconOnly
            />
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="flex items-center justify-center mt-6 gap-1">
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            New here?
          </span>
          <button
            onClick={handleSignUpLink}
            disabled={loading}
            className="text-sm font-medium hover:underline"
            style={{ color: colors.primary }}
          >
            Create an account
          </button>
        </div>
      </div>

      {/* Placeholder styles */}
      <style jsx>{`
        input::placeholder {
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default OnboardingPage;
