'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { SocialAuthButton } from '@/components/auth/SocialAuthButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { useToast } from '@/hooks/useToast';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

const OnboardingPage = () => {
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sign-in form state
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      scrollContainerRef.current?.scrollTo({
        left: scrollContainerRef.current.offsetWidth * (currentSlide - 1),
        behavior: 'smooth',
      });
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      scrollContainerRef.current?.scrollTo({
        left: scrollContainerRef.current.offsetWidth * (currentSlide + 1),
        behavior: 'smooth',
      });
    }
  };

  const slides = [
    {
      type: 'info',
      title: 'Welcome to TolKI',
      subtitle: 'Real-time voice translation',
      description: 'Speak naturally in 58 languages and get instant translations. Break down language barriers effortlessly.',
      icon: (
        <svg width="100" height="100" viewBox="0 0 120 120" fill="none">
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
        <svg width="100" height="100" viewBox="0 0 120 120" fill="none">
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
      className="min-h-screen flex flex-col overflow-hidden relative"
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
              <div className="w-full max-w-sm px-6">
                <div className="text-center mb-8">
                  <h1
                    className="text-2xl font-bold mb-1"
                    style={{ color: colors.foreground }}
                  >
                    {slide.title}
                  </h1>
                  <h2
                    className="text-xs"
                    style={{ color: colors.silverAlpha(0.7) }}
                  >
                    {slide.subtitle}
                  </h2>
                </div>

                <div
                  className="p-5 rounded-2xl"
                  style={{
                    backgroundColor: colors.background,
                  }}
                >
                  {/* Email Input */}
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      className="block font-semibold"
                      style={{
                        color: colors.foreground,
                        fontSize: '12px',
                        marginBottom: '6px',
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
                        borderRadius: '12px',
                        padding: '10px 12px',
                        minHeight: '40px',
                        fontSize: '15px', // Prevent iOS zoom
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
                    <label
                      className="block font-semibold"
                      style={{
                        color: colors.foreground,
                        fontSize: '12px',
                        marginBottom: '6px',
                      }}
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
                        className="w-full text-base"
                        style={{
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          boxShadow: shadows.pressed.boxShadow,
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 44px 10px 12px',
                          minHeight: '40px',
                          fontSize: '15px', // Prevent iOS zoom
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
                    <button
                      onClick={() => router.push('/forgot-password')}
                      disabled={loading}
                      className="font-semibold hover:underline"
                      style={{
                        color: colors.primary,
                        fontSize: '12px',
                        marginTop: '6px',
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
                      minHeight: '44px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      marginTop: '12px',
                      marginBottom: '16px',
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
                      gap: '12px',
                      marginTop: '12px',
                      marginBottom: '16px',
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
                        fontSize: '13px',
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
                        fontSize: '13px',
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Info Slides
              <div className="flex flex-col items-center text-center max-w-sm px-6">
                {/* Icon */}
                <div className="mb-10">{slide.icon}</div>

                {/* Title */}
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ color: colors.foreground }}
                >
                  {slide.title}
                </h1>

                {/* Subtitle */}
                <h2
                  className="text-lg font-medium mb-5"
                  style={{ color: colors.primary }}
                >
                  {slide.subtitle}
                </h2>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: colors.muted }}
                >
                  {slide.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Dots and Navigation Arrows */}
      <div
        className="flex justify-between items-center"
        style={{
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          paddingTop: '20px',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
        }}
      >
        {/* Left Arrow */}
        <button
          onClick={handlePrevSlide}
          disabled={currentSlide === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: currentSlide === 0 ? 'transparent' : colors.background,
            boxShadow: currentSlide === 0 ? 'none' : shadows.elevated.boxShadow,
            opacity: currentSlide === 0 ? 0 : 1,
            cursor: currentSlide === 0 ? 'default' : 'pointer',
            pointerEvents: currentSlide === 0 ? 'none' : 'auto',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Progress Dots */}
        <div className="flex justify-center items-center gap-2">
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

        {/* Right Arrow */}
        <button
          onClick={handleNextSlide}
          disabled={currentSlide === slides.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: currentSlide === slides.length - 1 ? 'transparent' : colors.background,
            boxShadow: currentSlide === slides.length - 1 ? 'none' : shadows.elevated.boxShadow,
            opacity: currentSlide === slides.length - 1 ? 0 : 1,
            cursor: currentSlide === slides.length - 1 ? 'default' : 'pointer',
            pointerEvents: currentSlide === slides.length - 1 ? 'none' : 'auto',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
