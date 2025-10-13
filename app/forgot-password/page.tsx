'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { NeumorphicCard } from '@/components/NeumorphicCard';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';
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
      alert('Please enter your email address');
      return;
    }

    if (!emailValidation.isValid) {
      alert(emailValidation.message || 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });

      setCurrentStep('code');
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Unable to send reset code. Please try again.';
      alert(errorMessage);
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

      alert('A new verification code has been sent to your email.');
      setCode('');
    } catch (err: any) {
      alert('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCodePress = async () => {
    if (!isLoaded) return;

    if (!code) {
      alert('Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      alert('Verification code must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      setCurrentStep('password');
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid verification code. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onResetPasswordPress = async () => {
    if (!isLoaded) return;

    if (!password) {
      alert('Please enter a new password');
      return;
    }

    if (!passwordValidation.isValid) {
      alert('Please ensure your password meets all requirements');
      return;
    }

    setLoading(true);

    try {
      await signIn.resetPassword({
        password,
      });

      setCurrentStep('success');
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Unable to reset password. Please try again.';
      alert(errorMessage);
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
          backgroundColor: colors.background,
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingTop: 'max(32px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <NeumorphicCard
          className="w-full max-w-md"
          style={{ padding: '32px', marginTop: '32px', marginBottom: '32px' }}
        >
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1
              className="text-3xl font-bold"
              style={{ color: colors.foreground, marginBottom: '8px' }}
            >
              Reset Password
            </h1>
            <p className="text-base" style={{ color: colors.silverAlpha(0.7) }}>
              Enter your email address and we&apos;ll send you a verification code
            </p>
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: '24px' }}>
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '13px', marginBottom: '8px' }}
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
                backgroundColor: colors.background,
                color: colors.foreground,
                boxShadow: shadows.pressed.boxShadow,
                border: emailError ? `1px solid #FF6B6B` : 'none',
                borderRadius: '16px',
                padding: '16px',
                minHeight: '50px',
                fontSize: '16px',
              }}
            />
            {emailError && (
              <p className="text-xs mt-1 ml-1" style={{ color: '#FF6B6B' }}>
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
              backgroundColor: (!emailValidation.isValid || loading) ? colors.silverAlpha(0.3) : colors.primary,
              color: (!emailValidation.isValid || loading) ? colors.silverAlpha(0.5) : colors.white,
              opacity: (!emailValidation.isValid || loading) ? 0.5 : 1,
              minHeight: '56px',
              borderRadius: '20px',
              fontSize: '16px',
              marginBottom: '24px',
              boxShadow: (!emailValidation.isValid || loading) ? 'none' : shadows.elevated.boxShadow,
            }}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>

          {/* Sign In Link */}
          <div className="flex items-center justify-center" style={{ gap: '4px' }}>
            <span style={{ color: colors.silverAlpha(0.7), fontSize: '16px' }}>
              Remember your password?
            </span>
            <button
              onClick={onBackToSignIn}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: colors.primary, fontSize: '16px' }}
            >
              Sign In
            </button>
          </div>
        </NeumorphicCard>
      </div>
    );
  }

  // Code Verification Step
  if (currentStep === 'code') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: colors.background,
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <NeumorphicCard
          className="w-full max-w-md"
          style={{ padding: '32px' }}
        >
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1
              className="text-3xl font-bold"
              style={{ color: colors.foreground, marginBottom: '8px' }}
            >
              Enter Code
            </h1>
            <p className="text-base" style={{ color: colors.silverAlpha(0.7) }}>
              We&apos;ve sent a 6-digit code to {emailAddress}
            </p>
          </div>

          {/* Code Input */}
          <div style={{ marginBottom: '24px' }}>
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '13px', marginBottom: '8px' }}
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
                backgroundColor: colors.background,
                color: colors.foreground,
                boxShadow: shadows.pressed.boxShadow,
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                minHeight: '50px',
                fontSize: '16px',
              }}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={onVerifyCodePress}
            disabled={code.length !== 6 || loading}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: (code.length !== 6 || loading) ? colors.silverAlpha(0.3) : colors.primary,
              color: (code.length !== 6 || loading) ? colors.silverAlpha(0.5) : colors.white,
              opacity: (code.length !== 6 || loading) ? 0.5 : 1,
              minHeight: '56px',
              borderRadius: '20px',
              fontSize: '16px',
              marginBottom: '24px',
              boxShadow: (code.length !== 6 || loading) ? 'none' : shadows.elevated.boxShadow,
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          {/* Resend Link */}
          <div className="flex items-center justify-center" style={{ gap: '4px' }}>
            <span style={{ color: colors.silverAlpha(0.7), fontSize: '16px' }}>
              Didn&apos;t receive the code?
            </span>
            <button
              onClick={onResendCode}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: colors.primary, fontSize: '16px' }}
            >
              Resend
            </button>
          </div>
        </NeumorphicCard>
      </div>
    );
  }

  // New Password Step
  if (currentStep === 'password') {
    return (
      <div
        className="min-h-screen flex items-center justify-center overflow-y-auto"
        style={{
          backgroundColor: colors.background,
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          paddingTop: 'max(32px, env(safe-area-inset-top))',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
        }}
      >
        <NeumorphicCard
          className="w-full max-w-md"
          style={{ padding: '32px', marginTop: '32px', marginBottom: '32px' }}
        >
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1
              className="text-3xl font-bold"
              style={{ color: colors.foreground, marginBottom: '8px' }}
            >
              New Password
            </h1>
            <p className="text-base" style={{ color: colors.silverAlpha(0.7) }}>
              Create a strong password for your account
            </p>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '24px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <label
                className="block font-semibold"
                style={{ color: colors.foreground, fontSize: '13px' }}
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
                    style={{ color: colors.white }}
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
                backgroundColor: colors.background,
                color: colors.foreground,
                boxShadow: shadows.pressed.boxShadow,
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                minHeight: '50px',
                fontSize: '16px',
              }}
            />

            {/* Password Requirements */}
            {(showPasswordRequirements || (password.length > 0 && !passwordValidation.isValid)) && (
              <div
                className="mt-2 p-2 rounded-lg"
                style={{
                  backgroundColor: colors.background,
                  boxShadow: shadows.soft.boxShadow,
                }}
              >
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: colors.foreground }}
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
                          backgroundColor: isMet ? '#66BB6A' : colors.silverAlpha(0.4),
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{
                          color: isMet ? '#66BB6A' : colors.silverAlpha(0.7),
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
              backgroundColor: (!passwordValidation.isValid || loading) ? colors.silverAlpha(0.3) : colors.primary,
              color: (!passwordValidation.isValid || loading) ? colors.silverAlpha(0.5) : colors.white,
              opacity: (!passwordValidation.isValid || loading) ? 0.5 : 1,
              minHeight: '56px',
              borderRadius: '20px',
              fontSize: '16px',
              boxShadow: (!passwordValidation.isValid || loading) ? 'none' : shadows.elevated.boxShadow,
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </NeumorphicCard>
      </div>
    );
  }

  // Success Step
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: colors.background,
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      <NeumorphicCard
        className="w-full max-w-md"
        style={{ padding: '48px' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="text-6xl mb-6"
            style={{ color: colors.primary }}
          >
            ✓
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: colors.foreground, marginBottom: '12px' }}
          >
            Password Reset!
          </h1>
          <p
            className="text-base"
            style={{ color: colors.silverAlpha(0.7), marginBottom: '48px' }}
          >
            Your password has been successfully reset. You can now sign in with your new password.
          </p>

          <button
            onClick={onBackToSignIn}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: colors.primary,
              color: colors.white,
              minHeight: '56px',
              borderRadius: '20px',
              fontSize: '16px',
              boxShadow: shadows.elevated.boxShadow,
            }}
          >
            Back to Sign In
          </button>
        </div>
      </NeumorphicCard>
    </div>
  );
}
