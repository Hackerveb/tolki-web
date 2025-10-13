'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { NeumorphicCard } from '@/components/NeumorphicCard';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

const OnboardingPage = () => {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sign-in form state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const slides = [
    {
      type: 'info',
      title: 'Welcome to TolKI',
      subtitle: 'Real-time voice translation',
      description: 'Speak naturally in 58 languages and get instant translations. Break down language barriers effortlessly.',
      icon: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          {/* Person 1 */}
          <circle cx="30" cy="40" r="12" stroke={colors.primary} strokeWidth="3" fill={colors.background} />
          <path d="M 20 60 Q 30 55 40 60" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Speech bubble 1 */}
          <circle cx="25" cy="25" r="2" fill={colors.primary} />
          <circle cx="30" cy="20" r="3" fill={colors.primary} />
          <circle cx="35" cy="25" r="2" fill={colors.primary} />
          {/* Person 2 */}
          <circle cx="90" cy="40" r="12" stroke={colors.accent} strokeWidth="3" fill={colors.background} />
          <path d="M 80 60 Q 90 55 100 60" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Speech bubble 2 */}
          <circle cx="85" cy="25" r="2" fill={colors.accent} />
          <circle cx="90" cy="20" r="3" fill={colors.accent} />
          <circle cx="95" cy="25" r="2" fill={colors.accent} />
          {/* Bidirectional arrow */}
          <path d="M 45 45 L 75 45" stroke={colors.foreground} strokeWidth="2" strokeLinecap="round" />
          <path d="M 48 42 L 45 45 L 48 48" stroke={colors.foreground} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 72 42 L 75 45 L 72 48" stroke={colors.foreground} strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      ),
    },
    {
      type: 'info',
      title: 'Ready to Start?',
      subtitle: "It&apos;s simple",
      description: 'Receive free credits, choose your languages, tap the record button, and speak. Your words are translated in real-time.',
      icon: (
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          {/* Microphone */}
          <circle cx="60" cy="50" r="15" stroke={colors.primary} strokeWidth="4" fill={colors.background} />
          <path d="M 45 50 Q 45 70 60 75 Q 75 70 75 50" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 60 75 L 60 85" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" />
          <path d="M 50 85 L 70 85" stroke={colors.primary} strokeWidth="4" strokeLinecap="round" />
          {/* Sound waves */}
          <path d="M 85 40 Q 90 50 85 60" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 95 35 Q 100 50 95 65" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      ),
    },
    {
      type: 'signin',
      title: 'Welcome Back',
      subtitle: 'Sign in to continue',
      description: '',
    },
  ];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const slideWidth = container.offsetWidth;
    const newSlide = Math.round(scrollLeft / slideWidth);
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide);
    }
  };

  const handleSkip = () => {
    // Scroll to sign-in page (slide 3)
    scrollContainerRef.current?.scrollTo({
      left: scrollContainerRef.current.offsetWidth * 2,
      behavior: 'smooth',
    });
  };

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
      alert('Please fill in all fields');
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
        alert('Unable to sign in. Please try again.');
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const errorMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Invalid email or password';
      alert(errorMessage);
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
      alert(err?.message || 'Failed to sign in with Google');
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
      alert(err?.message || 'Failed to sign in with Apple');
      setOauthLoading(null);
    }
  };

  const handleSignUpLink = () => {
    router.push('/sign-up');
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.background,
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      {/* Skip Button - only show on first 2 slides */}
      {currentSlide < 2 && (
        <div
          className="flex justify-end"
          style={{
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: '16px',
          }}
        >
          <button
            onClick={handleSkip}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: colors.muted }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 flex overflow-x-scroll snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className="min-w-full flex flex-col items-center justify-center snap-start"
            style={{
              paddingBottom: currentSlide === 2 ? '0' : '80px',
            }}
          >
            {slide.type === 'signin' ? (
              // Sign In Screen
              <div className="w-full max-w-md px-6">
                <div className="text-center mb-16">
                  <h1
                    className="text-4xl font-bold mb-2"
                    style={{ color: colors.foreground }}
                  >
                    {slide.title}
                  </h1>
                  <h2
                    className="text-base"
                    style={{ color: colors.silverAlpha(0.7) }}
                  >
                    {slide.subtitle}
                  </h2>
                </div>

                <NeumorphicCard className="p-8">
                  {/* Email Input */}
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      className="block font-semibold"
                      style={{
                        color: colors.foreground,
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}
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
                        fontSize: '16px', // Prevent iOS zoom
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
                    <label
                      className="block font-semibold"
                      style={{
                        color: colors.foreground,
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
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
                        fontSize: '16px', // Prevent iOS zoom
                      }}
                    />
                    <button
                      onClick={() => router.push('/forgot-password')}
                      disabled={loading}
                      className="font-semibold hover:underline"
                      style={{
                        color: colors.primary,
                        fontSize: '13px',
                        marginTop: '8px',
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <button
                    onClick={handleSignInPress}
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
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* Auth Divider */}
                  <AuthDivider />

                  {/* Social Auth Buttons */}
                  <div
                    className="flex items-center justify-center"
                    style={{
                      gap: '16px',
                      marginTop: '16px',
                      marginBottom: '24px',
                    }}
                  >
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

                  {/* Sign Up Link */}
                  <div
                    className="flex items-center justify-center"
                    style={{ gap: '4px' }}
                  >
                    <span
                      style={{
                        color: colors.silverAlpha(0.7),
                        fontSize: '16px',
                      }}
                    >
                      Don&apos;t have an account?
                    </span>
                    <button
                      onClick={handleSignUpLink}
                      disabled={loading}
                      className="font-semibold hover:underline"
                      style={{
                        color: colors.primary,
                        fontSize: '16px',
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                </NeumorphicCard>
              </div>
            ) : (
              // Info Slides
              <div className="flex flex-col items-center text-center max-w-md px-6">
                {/* Icon */}
                <div className="mb-12">{slide.icon}</div>

                {/* Title */}
                <h1
                  className="text-4xl font-bold mb-2"
                  style={{ color: colors.foreground }}
                >
                  {slide.title}
                </h1>

                {/* Subtitle */}
                <h2
                  className="text-xl font-medium mb-6"
                  style={{ color: colors.primary }}
                >
                  {slide.subtitle}
                </h2>

                {/* Description */}
                <p
                  className="text-base leading-relaxed"
                  style={{ color: colors.muted }}
                >
                  {slide.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Dots */}
      <div
        className="flex justify-center items-center gap-2"
        style={{
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
          paddingTop: '24px',
        }}
      >
        {slides.map((_, index) => (
          <div
            key={index}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: index === currentSlide ? '24px' : '8px',
              backgroundColor: index === currentSlide ? colors.primary : colors.muted,
              opacity: index === currentSlide ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Hide scrollbar & style placeholders */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
        input::placeholder {
          color: ${colors.silverAlpha(0.5)};
        }
        input::-webkit-input-placeholder {
          color: ${colors.silverAlpha(0.5)};
        }
        input::-moz-placeholder {
          color: ${colors.silverAlpha(0.5)};
          opacity: 1;
        }
        input:-ms-input-placeholder {
          color: ${colors.silverAlpha(0.5)};
        }
      `}</style>
    </div>
  );
};

export default OnboardingPage;
