'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { useToast } from '@/hooks/useToast';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthColor,
  getPasswordRequirementsList,
} from '@/utils/validation';

// Glass panel style shared across verification and signup forms
const glassPanelStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow-lg)',
  borderRadius: '28px',
  padding: '40px 28px',
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

export default function SignUpPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { toast } = useToast();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailBlur = () => {
    if (emailAddress.trim().length > 0) {
      const validation = validateEmail(emailAddress);
      setEmailError(validation.isValid ? null : validation.message || 'Invalid email');
    }
  };

  const handleEmailFocus = () => setEmailError(null);
  const handlePasswordFocus = () => setShowPasswordRequirements(true);
  const handlePasswordBlur = () => setShowPasswordRequirements(false);

  const passwordValidation = validatePassword(password);
  const emailValidation = validateEmail(emailAddress);

  const isFormValid = emailValidation.isValid &&
                      passwordValidation.isValid &&
                      firstName.trim() !== '' &&
                      lastName.trim() !== '';
  const isButtonDisabled = loading || !isFormValid || oauthLoading !== null;

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!emailAddress || !password || !firstName || !lastName) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp.create({ emailAddress, password, firstName, lastName });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('A new verification code has been sent to your email.');
      setCode('');
    } catch {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    if (!code) {
      toast.error('Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.push('/');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      toast.error(error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;
    try {
      setOauthLoading('google');
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Failed to sign up with Google');
      setOauthLoading(null);
    }
  };

  const handleAppleSignUp = async () => {
    if (!isLoaded) return;
    try {
      setOauthLoading('apple');
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || 'Failed to sign up with Apple');
      setOauthLoading(null);
    }
  };

  // ─── Page layout shared wrapper ──────────────────────────────────────────
  const pageWrapper = (children: React.ReactNode) => (
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
        {/* Logo / App name */}
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
        {children}
      </div>
    </div>
  );

  // ─── Email Verification Screen ────────────────────────────────────────────
  if (pendingVerification) {
    return pageWrapper(
      <div style={glassPanelStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '6px' }}>
            Check your email
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            We sent a code to <strong>{emailAddress}</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Check your spam folder if you don&apos;t see it
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Verification Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            disabled={loading}
            maxLength={6}
            style={{
              ...glassInputStyle,
              textAlign: 'center',
              fontSize: '22px',
              letterSpacing: '0.2em',
              fontWeight: '600',
            }}
          />
        </div>

        <button
          onClick={onVerifyPress}
          disabled={loading}
          className="w-full font-semibold transition-all"
          style={{
            background: loading ? 'var(--color-neutral-300)' : 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
            color: 'white',
            opacity: loading ? 0.6 : 1,
            minHeight: '52px',
            borderRadius: '16px',
            fontSize: '16px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: !loading ? '0 8px 24px rgba(37, 99, 235, 0.3)' : 'none',
            marginBottom: '16px',
          }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <div className="flex items-center justify-center gap-1">
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Didn&apos;t receive it?
          </span>
          <button
            onClick={onResendCode}
            disabled={loading}
            className="font-semibold hover:underline"
            style={{ color: 'var(--color-primary)', fontSize: '14px' }}
          >
            Resend
          </button>
        </div>
      </div>
    );
  }

  // ─── Sign Up Form ─────────────────────────────────────────────────────────
  return pageWrapper(
    <div style={glassPanelStyle}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Create Account
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Join TolKI to start translating
        </p>
      </div>

      {/* Social Auth Buttons — large, inviting */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={handleGoogleSignUp}
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
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>Google</span>
            </>
          )}
        </button>

        <button
          onClick={handleAppleSignUp}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-text-primary)">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>Apple</span>
            </>
          )}
        </button>
      </div>

      <AuthDivider />

      {/* Name Fields */}
      <div className="flex gap-3 mt-6 mb-5">
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            First
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            disabled={loading}
            style={glassInputStyle}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Last
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            disabled={loading}
            style={glassInputStyle}
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
          style={{
            ...glassInputStyle,
            borderColor: emailError ? 'var(--color-error)' : undefined,
          }}
        />
        {emailError && (
          <p className="text-xs mt-1 ml-1" style={{ color: 'var(--color-error)' }}>{emailError}</p>
        )}
      </div>

      {/* Password */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Password
          </label>
          {password.length > 0 && (
            <div
              className="px-2 py-0.5 rounded-full"
              style={{
                background: `${getPasswordStrengthColor(passwordValidation.strength)}20`,
                border: `1px solid ${getPasswordStrengthColor(passwordValidation.strength)}`,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: getPasswordStrengthColor(passwordValidation.strength) }}>
                {passwordValidation.strength === 'weak' ? 'Weak' : passwordValidation.strength === 'medium' ? 'Good' : 'Strong'}
              </span>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={handlePasswordFocus}
            onBlur={handlePasswordBlur}
            placeholder="Create a strong password"
            disabled={loading}
            style={{ ...glassInputStyle, paddingRight: '48px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--color-text-secondary)" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="var(--color-text-secondary)" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        {(showPasswordRequirements || (password.length > 0 && !passwordValidation.isValid)) && (
          <div
            className="mt-2 p-3 rounded-xl"
            style={{
              background: 'var(--glass-input-bg)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--glass-border-subtle)',
            }}
          >
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Password must contain:
            </p>
            {getPasswordRequirementsList().map((requirement, index) => {
              const isMet = !passwordValidation.errors.includes(requirement);
              return (
                <div key={index} className="flex items-center gap-2 my-1">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isMet ? 'var(--color-success)' : 'var(--color-neutral-300)' }} />
                  <span className="text-xs" style={{ color: isMet ? 'var(--color-success)' : 'var(--color-text-secondary)', fontWeight: isMet ? '500' : 'normal' }}>
                    {requirement}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign Up Button */}
      <button
        onClick={onSignUpPress}
        disabled={isButtonDisabled}
        className="w-full font-semibold transition-all active:scale-[0.98]"
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
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>

      {/* Sign In Link */}
      <div className="flex items-center justify-center gap-1">
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Already have an account?
        </span>
        <button
          onClick={() => router.push('/onboarding')}
          disabled={loading}
          className="font-semibold hover:underline"
          style={{ color: 'var(--color-primary)', fontSize: '14px' }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
