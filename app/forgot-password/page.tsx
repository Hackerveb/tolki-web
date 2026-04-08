'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { useToast } from '@/hooks/useToast';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthAlpha,
  getPasswordRequirementsList,
} from '@/utils/validation';

type ResetStep = 'email' | 'code' | 'password' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<ResetStep>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const handleEmailBlur = () => {
    if (emailAddress.trim().length > 0) {
      const validation = validateEmail(emailAddress);
      setEmailError(validation.isValid ? null : validation.message || 'Invalid email');
    }
  };

  const handleEmailFocus = () => {
    setEmailError(null);
  };

  const handlePasswordFocus = () => {
    setShowPasswordRequirements(true);
  };

  const handlePasswordBlur = () => {
    setShowPasswordRequirements(false);
  };

  const passwordValidation = validatePassword(password);
  const emailValidation = validateEmail(emailAddress);

  const onSendCodePress = async () => {
    if (!isLoaded) return;

    if (!emailAddress) {
      toast.error('Please enter your email address');
      return;
    }

    if (!emailValidation.isValid) {
      toast.error(emailValidation.message || 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });

      setCurrentStep('code');
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Unable to send reset code. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });

      toast.success('A new verification code has been sent to your email.');
      setCode('');
    } catch {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCodePress = async () => {
    if (!isLoaded) return;

    if (!code) {
      toast.error('Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      setCurrentStep('password');
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid verification code. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onResetPasswordPress = async () => {
    if (!isLoaded) return;

    if (!password) {
      toast.error('Please enter a new password');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('Please ensure your password meets all requirements');
      return;
    }

    setLoading(true);

    try {
      await signIn.resetPassword({
        password,
      });

      setCurrentStep('success');
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Unable to reset password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onBackToSignIn = () => {
    router.push('/onboarding');
  };

  // Shared page wrapper for all steps
  const pageWrapper = (children: React.ReactNode) => (
    <div
      className="min-h-screen flex items-center justify-center overflow-y-auto glass-page"
      style={{
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
        paddingTop: 'max(32px, env(safe-area-inset-top))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="w-full max-w-sm glass"
        style={{
          padding: '28px 24px',
          marginTop: '16px',
          marginBottom: '16px',
          borderRadius: '24px',
        }}
      >
        {children}
      </div>
    </div>
  );

  // Email Step
  if (currentStep === 'email') {
    return pageWrapper(
      <>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: 'var(--glass-glow-primary)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)', marginBottom: '6px' }}
          >
            Reset Password
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Enter your email address and we&apos;ll send you a verification code
          </p>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reset-email"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
          >
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            onBlur={handleEmailBlur}
            onFocus={handleEmailFocus}
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
            className="w-full glass-input"
            style={{
              color: 'var(--color-text-primary)',
              borderRadius: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              fontSize: '15px',
              borderColor: emailError ? 'var(--color-error)' : undefined,
            }}
          />
          {emailError && (
            <p className="text-xs mt-1 ml-1" role="alert" style={{ color: 'var(--color-error)' }}>
              {emailError}
            </p>
          )}
        </div>

        {/* Send Code Button */}
        <button
          onClick={onSendCodePress}
          disabled={!emailValidation.isValid || loading}
          className="w-full font-semibold transition-all active:scale-[0.98]"
          style={{
            background: (!emailValidation.isValid || loading)
              ? 'var(--color-neutral-300)'
              : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            color: (!emailValidation.isValid || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
            opacity: (!emailValidation.isValid || loading) ? 0.5 : 1,
            minHeight: '48px',
            borderRadius: '14px',
            fontSize: '16px',
            marginBottom: '16px',
            boxShadow: (!emailValidation.isValid || loading) ? 'none' : 'var(--glass-glow-primary)',
            border: 'none',
            cursor: (!emailValidation.isValid || loading) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sending...' : 'Send Code'}
        </button>

        {/* Sign In Link */}
        <div className="flex items-center justify-center gap-1">
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Remember your password?
          </span>
          <button
            onClick={onBackToSignIn}
            disabled={loading}
            className="font-semibold hover:underline"
            style={{ color: 'var(--color-primary)', fontSize: '14px', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  // Code Verification Step
  if (currentStep === 'code') {
    return pageWrapper(
      <>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-success), #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0H4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)', marginBottom: '6px' }}
          >
            Enter Code
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            We&apos;ve sent a 6-digit code to {emailAddress}
          </p>
        </div>

        {/* Code Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reset-code"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
          >
            Verification Code
          </label>
          <input
            id="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            disabled={loading}
            maxLength={6}
            className="w-full glass-input"
            style={{
              color: 'var(--color-text-primary)',
              borderRadius: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              fontSize: '22px',
              letterSpacing: '6px',
              textAlign: 'center',
              fontWeight: '700',
            }}
          />
        </div>

        {/* Verify Button */}
        <button
          onClick={onVerifyCodePress}
          disabled={code.length !== 6 || loading}
          className="w-full font-semibold transition-all active:scale-[0.98]"
          style={{
            background: (code.length !== 6 || loading)
              ? 'var(--color-neutral-300)'
              : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            color: (code.length !== 6 || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
            opacity: (code.length !== 6 || loading) ? 0.5 : 1,
            minHeight: '48px',
            borderRadius: '14px',
            fontSize: '16px',
            marginBottom: '16px',
            boxShadow: (code.length !== 6 || loading) ? 'none' : 'var(--glass-glow-primary)',
            border: 'none',
            cursor: (code.length !== 6 || loading) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>

        {/* Resend Link */}
        <div className="flex items-center justify-center gap-1">
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Didn&apos;t receive the code?
          </span>
          <button
            onClick={onResendCode}
            disabled={loading}
            className="font-semibold hover:underline"
            style={{ color: 'var(--color-primary)', fontSize: '14px', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Resend
          </button>
        </div>
      </>
    );
  }

  // New Password Step
  if (currentStep === 'password') {
    return pageWrapper(
      <>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: 'var(--glass-glow-primary)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)', marginBottom: '6px' }}
          >
            New Password
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Create a strong password for your account
          </p>
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '16px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <label
              htmlFor="reset-password"
              className="block text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
            >
              Password
            </label>
            {password.length > 0 && (
              <div
                className="px-2 py-0.5 rounded-full"
                style={{
                  background: getPasswordStrengthAlpha(passwordValidation.strength),
                  border: `1px solid ${getPasswordStrengthColor(passwordValidation.strength)}`,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: getPasswordStrengthColor(passwordValidation.strength) }}>
                  {passwordValidation.strength === 'weak' && 'Weak'}
                  {passwordValidation.strength === 'medium' && 'Good'}
                  {passwordValidation.strength === 'strong' && 'Strong'}
                </span>
              </div>
            )}
          </div>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={handlePasswordFocus}
            onBlur={handlePasswordBlur}
            placeholder="Create a strong password"
            disabled={loading}
            autoComplete="new-password"
            className="w-full glass-input"
            style={{
              color: 'var(--color-text-primary)',
              borderRadius: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              fontSize: '15px',
            }}
          />

          {/* Password Requirements */}
          {(showPasswordRequirements || (password.length > 0 && !passwordValidation.isValid)) && (
            <div className="mt-2 p-3 glass-subtle" style={{ borderRadius: '12px' }}>
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Password must contain:
              </p>
              {getPasswordRequirementsList().map((requirement, index) => {
                const isMet = !passwordValidation.errors.includes(requirement);
                return (
                  <div key={index} className="flex items-center gap-2 my-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isMet ? 'var(--color-success)' : 'var(--color-neutral-300)',
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{
                        color: isMet ? 'var(--color-success)' : 'var(--color-text-secondary)',
                        fontWeight: isMet ? '500' : 'normal',
                      }}
                    >
                      {requirement}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset Password Button */}
        <button
          onClick={onResetPasswordPress}
          disabled={!passwordValidation.isValid || loading}
          className="w-full font-semibold transition-all active:scale-[0.98]"
          style={{
            background: (!passwordValidation.isValid || loading)
              ? 'var(--color-neutral-300)'
              : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
            color: (!passwordValidation.isValid || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
            opacity: (!passwordValidation.isValid || loading) ? 0.5 : 1,
            minHeight: '48px',
            borderRadius: '14px',
            fontSize: '16px',
            boxShadow: (!passwordValidation.isValid || loading) ? 'none' : 'var(--glass-glow-primary)',
            border: 'none',
            cursor: (!passwordValidation.isValid || loading) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </>
    );
  }

  // Success Step
  return pageWrapper(
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-success), #10B981)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1
        className="text-xl font-bold"
        style={{ color: 'var(--color-text-primary)', marginBottom: '10px' }}
      >
        Password Reset!
      </h1>
      <p
        className="text-sm"
        style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}
      >
        Your password has been successfully reset. You can now sign in with your new password.
      </p>

      <button
        onClick={onBackToSignIn}
        className="w-full font-semibold transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
          color: '#FFFFFF',
          minHeight: '52px',
          borderRadius: '16px',
          fontSize: '16px',
          boxShadow: 'var(--glass-glow-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Back to Sign In
      </button>
    </div>
  );
}
