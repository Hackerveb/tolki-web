'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { colors } from '@/styles/colors';
import { useToast } from '@/hooks/useToast';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthColor,
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

  // Validate email on blur
  const handleEmailBlur = () => {
    if (emailAddress.trim().length > 0) {
      const validation = validateEmail(emailAddress);
      setEmailError(validation.isValid ? null : validation.message || 'Invalid email');
    }
  };

  // Clear email error on focus
  const handleEmailFocus = () => {
    setEmailError(null);
  };

  // Show password requirements when password field is focused
  const handlePasswordFocus = () => {
    setShowPasswordRequirements(true);
  };

  // Hide password requirements when password field loses focus
  const handlePasswordBlur = () => {
    setShowPasswordRequirements(false);
  };

  // Get current password validation
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

  // Email Step
  if (currentStep === 'email') {
    return (
      <div
        className="min-h-screen flex items-center justify-center overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingTop: 'max(32px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl"
          style={{
            padding: '20px',
            marginTop: '16px',
            marginBottom: '16px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}
            >
              Reset Password
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Enter your email address and we&apos;ll send you a verification code
            </p>
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: '12px' }}>
            <label
              className="block font-semibold"
              style={{ color: 'var(--color-text-primary)', fontSize: '12px', marginBottom: '6px' }}
            >
              Email
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              onBlur={handleEmailBlur}
              onFocus={handleEmailFocus}
              placeholder="Enter your email"
              disabled={loading}
              className="w-full text-base"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                boxShadow: 'var(--shadow-inner)',
                border: emailError ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
            {emailError && (
              <p className="text-xs mt-1 ml-1" style={{ color: 'var(--color-error)' }}>
                {emailError}
              </p>
            )}
          </div>

          {/* Send Code Button */}
          <button
            onClick={onSendCodePress}
            disabled={!emailValidation.isValid || loading}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: (!emailValidation.isValid || loading) ? 'var(--color-neutral-200)' : 'var(--color-primary)',
              color: (!emailValidation.isValid || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
              opacity: (!emailValidation.isValid || loading) ? 0.5 : 1,
              minHeight: '44px',
              borderRadius: '12px',
              fontSize: '15px',
              marginBottom: '12px',
              boxShadow: (!emailValidation.isValid || loading) ? 'none' : 'var(--shadow-md)',
            }}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>

          {/* Sign In Link */}
          <div className="flex items-center justify-center" style={{ gap: '4px' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Remember your password?
            </span>
            <button
              onClick={onBackToSignIn}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary)', fontSize: '13px' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Code Verification Step
  if (currentStep === 'code') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-background)',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}
            >
              Enter Code
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              We&apos;ve sent a 6-digit code to {emailAddress}
            </p>
          </div>

          {/* Code Input */}
          <div style={{ marginBottom: '12px' }}>
            <label
              className="block font-semibold"
              style={{ color: 'var(--color-text-primary)', fontSize: '12px', marginBottom: '6px' }}
            >
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              disabled={loading}
              maxLength={6}
              className="w-full text-base"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                boxShadow: 'var(--shadow-inner)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={onVerifyCodePress}
            disabled={code.length !== 6 || loading}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: (code.length !== 6 || loading) ? 'var(--color-neutral-200)' : 'var(--color-primary)',
              color: (code.length !== 6 || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
              opacity: (code.length !== 6 || loading) ? 0.5 : 1,
              minHeight: '44px',
              borderRadius: '12px',
              fontSize: '15px',
              marginBottom: '12px',
              boxShadow: (code.length !== 6 || loading) ? 'none' : 'var(--shadow-md)',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          {/* Resend Link */}
          <div className="flex items-center justify-center" style={{ gap: '4px' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Didn&apos;t receive the code?
            </span>
            <button
              onClick={onResendCode}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary)', fontSize: '13px' }}
            >
              Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New Password Step
  if (currentStep === 'password') {
    return (
      <div
        className="min-h-screen flex items-center justify-center overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-background)',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingTop: 'max(32px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl"
          style={{
            padding: '20px',
            marginTop: '16px',
            marginBottom: '16px',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)', marginBottom: '4px' }}
            >
              New Password
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Create a strong password for your account
            </p>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '12px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
              <label
                className="block font-semibold"
                style={{ color: 'var(--color-text-primary)', fontSize: '12px' }}
              >
                Password
              </label>
              {password.length > 0 && (
                <div
                  className="px-2 py-0.5 rounded-lg"
                  style={{ backgroundColor: getPasswordStrengthColor(passwordValidation.strength) }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: '#FFFFFF' }}
                  >
                    {passwordValidation.strength === 'weak' && 'Weak'}
                    {passwordValidation.strength === 'medium' && 'Good'}
                    {passwordValidation.strength === 'strong' && 'Strong'}
                  </span>
                </div>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              placeholder="Create a strong password"
              disabled={loading}
              className="w-full text-base"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                boxShadow: 'var(--shadow-inner)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />

            {/* Password Requirements */}
            {(showPasswordRequirements || (password.length > 0 && !passwordValidation.isValid)) && (
              <div
                className="mt-2 p-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Password must contain:
                </p>
                {getPasswordRequirementsList().map((requirement, index) => {
                  const isMet = !passwordValidation.errors.includes(requirement);
                  return (
                    <div key={index} className="flex items-center my-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full mr-2"
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
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: (!passwordValidation.isValid || loading) ? 'var(--color-neutral-200)' : 'var(--color-primary)',
              color: (!passwordValidation.isValid || loading) ? 'var(--color-text-tertiary)' : '#FFFFFF',
              opacity: (!passwordValidation.isValid || loading) ? 0.5 : 1,
              minHeight: '44px',
              borderRadius: '12px',
              fontSize: '15px',
              boxShadow: (!passwordValidation.isValid || loading) ? 'none' : 'var(--shadow-md)',
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    );
  }

  // Success Step
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: 'var(--color-background)',
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl"
        style={{
          padding: '24px',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}
          >
            Password Reset!
          </h1>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}
          >
            Your password has been successfully reset. You can now sign in with your new password.
          </p>

          <button
            onClick={onBackToSignIn}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              minHeight: '44px',
              borderRadius: '12px',
              fontSize: '15px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
