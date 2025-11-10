'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { useToast } from '@/hooks/useToast';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthColor,
  getPasswordRequirementsList,
} from '@/utils/validation';

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

  // Check if all required fields are filled AND valid
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
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Unable to create account';
      toast.error(errorMessage);
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
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.push('/');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid verification code';
      toast.error(errorMessage);
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

  // Email Verification Screen
  if (pendingVerification) {
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
        <div
          className="w-full max-w-sm rounded-2xl"
          style={{ padding: '20px', backgroundColor: colors.background }}
        >
          {/* Header */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <h1
              className="text-xl font-bold"
              style={{ color: colors.foreground, marginBottom: '4px' }}
            >
              Verify Email
            </h1>
            <p className="text-xs" style={{ color: colors.silverAlpha(0.7) }}>
              We&apos;ve sent a verification code to {emailAddress}
            </p>
            <p className="text-xs mt-2" style={{ color: colors.silverAlpha(0.6) }}>
              Please check your spam/trash folder if you don&apos;t see it
            </p>
          </div>

          {/* Code Input */}
          <div style={{ marginBottom: '12px' }}>
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '12px', marginBottom: '6px' }}
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
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={onVerifyPress}
            disabled={loading}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: loading ? colors.silverAlpha(0.3) : colors.primary,
              color: loading ? colors.silverAlpha(0.5) : colors.white,
              opacity: loading ? 0.5 : 1,
              minHeight: '44px',
              borderRadius: '12px',
              fontSize: '15px',
              marginBottom: '12px',
              boxShadow: !loading ? shadows.elevated.boxShadow : 'none',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend Link */}
          <div className="flex items-center justify-center" style={{ gap: '4px' }}>
            <span style={{ color: colors.silverAlpha(0.7), fontSize: '15px' }}>
              Didn&apos;t receive the code?
            </span>
            <button
              onClick={onResendCode}
              disabled={loading}
              className="font-semibold hover:underline"
              style={{ color: colors.primary, fontSize: '15px' }}
            >
              Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign Up Form
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
      <div
        className="w-full max-w-sm rounded-2xl"
        style={{ padding: '20px', marginTop: '16px', marginBottom: '16px', backgroundColor: colors.background }}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <h1
            className="text-xl font-bold"
            style={{ color: colors.foreground, marginBottom: '4px' }}
          >
            Create Account
          </h1>
          <p className="text-xs" style={{ color: colors.silverAlpha(0.7) }}>
            Join TolKI to start translating
          </p>
        </div>

        {/* Name Fields */}
        <div className="flex" style={{ gap: '10px', marginBottom: '12px' }}>
          <div className="flex-1">
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '12px', marginBottom: '6px' }}
            >
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={loading}
              className="w-full text-base"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                boxShadow: shadows.pressed.boxShadow,
                border: 'none',
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
          </div>

          <div className="flex-1">
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '12px', marginBottom: '6px' }}
            >
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={loading}
              className="w-full text-base"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
                boxShadow: shadows.pressed.boxShadow,
                border: 'none',
                borderRadius: '12px',
                padding: '10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
          </div>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: '12px' }}>
          <label
            className="block font-semibold"
            style={{ color: colors.foreground, fontSize: '12px', marginBottom: '6px' }}
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
              borderRadius: '12px',
              padding: '10px 12px',
              minHeight: '40px',
              fontSize: '15px',
            }}
          />
          {emailError && (
            <p className="text-xs mt-1 ml-1" style={{ color: '#FF6B6B' }}>
              {emailError}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '12px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '12px' }}
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
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
                borderRadius: '12px',
                padding: '10px 44px 10px 12px',
                minHeight: '40px',
                fontSize: '15px',
              }}
            />
            {/* Password visibility toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.background,
                boxShadow: shadows.subtle.boxShadow,
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    stroke={colors.muted}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={colors.muted} strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke={colors.muted} strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>

          {/* Password Requirements */}
          {(showPasswordRequirements || (password.length > 0 && !passwordValidation.isValid)) && (
            <div
              className="mt-2 p-2 rounded-lg"
              style={{
                backgroundColor: colors.background,
                boxShadow: shadows.subtle.boxShadow,
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

        {/* Sign Up Button */}
        <button
          onClick={onSignUpPress}
          disabled={isButtonDisabled}
          className="w-full font-semibold transition-all"
          style={{
            backgroundColor: isButtonDisabled ? colors.silverAlpha(0.3) : colors.primary,
            color: isButtonDisabled ? colors.silverAlpha(0.5) : colors.white,
            opacity: isButtonDisabled ? 0.5 : 1,
            minHeight: '44px',
            borderRadius: '12px',
            fontSize: '15px',
            marginTop: '12px',
            marginBottom: '16px',
            boxShadow: !isButtonDisabled ? shadows.elevated.boxShadow : 'none',
          }}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>

        {/* Divider */}
        <AuthDivider />

        {/* Social Auth Buttons */}
        <div
          className="flex items-center justify-center"
          style={{ gap: '12px', marginTop: '12px', marginBottom: '16px' }}
        >
          <SocialAuthButton
            provider="google"
            onPress={handleGoogleSignUp}
            disabled={loading || oauthLoading !== null}
            loading={oauthLoading === 'google'}
            iconOnly
          />
          <SocialAuthButton
            provider="apple"
            onPress={handleAppleSignUp}
            disabled={loading || oauthLoading !== null}
            loading={oauthLoading === 'apple'}
            iconOnly
          />
        </div>

        {/* Sign In Link */}
        <div className="flex items-center justify-center" style={{ gap: '4px' }}>
          <span style={{ color: colors.silverAlpha(0.7), fontSize: '13px' }}>
            Already have an account?
          </span>
          <button
            onClick={() => router.push('/onboarding')}
            disabled={loading}
            className="font-semibold hover:underline"
            style={{ color: colors.primary, fontSize: '13px' }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
