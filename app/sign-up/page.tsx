'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { NeumorphicCard } from '@/components/NeumorphicCard';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
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
      alert('Please fill in all fields');
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
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Unable to create account';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      alert('A new verification code has been sent to your email.');
      setCode('');
    } catch (err: any) {
      alert('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (!code) {
      alert('Please enter the verification code');
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
        alert('Verification failed. Please try again.');
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid verification code';
      alert(errorMessage);
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
    } catch (error: any) {
      alert(error?.message || 'Failed to sign up with Google');
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
    } catch (error: any) {
      alert(error?.message || 'Failed to sign up with Apple');
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
              Verify Email
            </h1>
            <p className="text-base" style={{ color: colors.silverAlpha(0.7) }}>
              We&apos;ve sent a verification code to {emailAddress}
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
            onClick={onVerifyPress}
            disabled={loading}
            className="w-full font-semibold transition-all"
            style={{
              backgroundColor: loading ? colors.silverAlpha(0.3) : colors.primary,
              color: loading ? colors.silverAlpha(0.5) : colors.white,
              opacity: loading ? 0.5 : 1,
              minHeight: '56px',
              borderRadius: '20px',
              fontSize: '16px',
              marginBottom: '24px',
              boxShadow: !loading ? shadows.elevated.boxShadow : 'none',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
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
      <NeumorphicCard
        className="w-full max-w-md"
        style={{ padding: '32px', marginTop: '32px', marginBottom: '32px' }}
      >
        {/* Name Fields */}
        <div className="flex" style={{ gap: '16px', marginBottom: '24px' }}>
          <div className="flex-1">
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '13px', marginBottom: '8px' }}
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
                borderRadius: '16px',
                padding: '16px',
                minHeight: '50px',
                fontSize: '16px',
              }}
            />
          </div>

          <div className="flex-1">
            <label
              className="block font-semibold"
              style={{ color: colors.foreground, fontSize: '13px', marginBottom: '8px' }}
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
                borderRadius: '16px',
                padding: '16px',
                minHeight: '50px',
                fontSize: '16px',
              }}
            />
          </div>
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

        {/* Sign Up Button */}
        <button
          onClick={onSignUpPress}
          disabled={isButtonDisabled}
          className="w-full font-semibold transition-all"
          style={{
            backgroundColor: isButtonDisabled ? colors.silverAlpha(0.3) : colors.primary,
            color: isButtonDisabled ? colors.silverAlpha(0.5) : colors.white,
            opacity: isButtonDisabled ? 0.5 : 1,
            minHeight: '56px',
            borderRadius: '20px',
            fontSize: '16px',
            marginTop: '24px',
            marginBottom: '32px',
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
          style={{ gap: '16px', marginTop: '16px', marginBottom: '24px' }}
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
          <span style={{ color: colors.silverAlpha(0.7), fontSize: '16px' }}>
            Already have an account?
          </span>
          <button
            onClick={() => router.push('/onboarding')}
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
