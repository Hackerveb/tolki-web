'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { motion } from 'motion/react';
import { api } from '@/convex/_generated/api';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { Language } from '@/types';
import { languages } from '@/lib/languages';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="15 18 9 12 15 6"
      stroke="var(--color-text-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { email: userEmail, initials, convexUser } = useCurrentUser();
  const updateDefaultLanguage = useMutation(api.users.updateDefaultLanguage);
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email] = useState(userEmail);
  const [phone] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }

    if (convexUser?.defaultLanguage) {
      const savedLanguage = languages.find(lang => lang.code === convexUser.defaultLanguage);
      if (savedLanguage) {
        setSelectedLanguage(savedLanguage);
      }
    }
  }, [user, convexUser]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (user.id && selectedLanguage) {
        await updateDefaultLanguage({
          clerkId: user.id,
          language: selectedLanguage.code,
        });
      }

      toast.success('Profile updated successfully');
      router.push('/settings');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden glass-page"
    >
      {/* Glass Header */}
      <header
        className="flex items-center glass-strong"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--glass-border)',
          borderRadius: 0,
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
          Edit Profile
        </h1>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center glass"
          style={{
            padding: '28px 24px',
            borderRadius: '20px',
            marginTop: '20px',
            marginBottom: '16px',
          }}
        >
          {/* Avatar with gradient ring */}
          <div
            style={{
              padding: '3px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #818CF8, #38BDF8)',
              boxShadow: 'var(--glass-glow-primary)',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
              }}
            >
              <span style={{ fontSize: '40px', fontWeight: '600', color: 'var(--color-on-primary)' }}>
                {initials}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass"
          style={{
            padding: '24px',
            borderRadius: '20px',
            marginBottom: '16px',
            overflow: 'visible',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* First Name */}
          <div style={{ marginBottom: '20px' }}>
            <label
              className="block uppercase"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.6px',
                marginBottom: '8px',
              }}
            >
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
              placeholder="Enter your first name"
              className="w-full glass-input"
              style={{
                fontSize: '16px',
                color: 'var(--color-text-primary)',
                padding: '12px 16px',
                borderRadius: '10px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--glass-border)', marginBottom: '20px' }} />

          {/* Last Name */}
          <div style={{ marginBottom: '20px' }}>
            <label
              className="block uppercase"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.6px',
                marginBottom: '8px',
              }}
            >
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              placeholder="Enter your last name"
              className="w-full glass-input"
              style={{
                fontSize: '16px',
                color: 'var(--color-text-primary)',
                padding: '12px 16px',
                borderRadius: '10px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--glass-border)', marginBottom: '20px' }} />

          {/* Email (Read-only) */}
          <div style={{ marginBottom: '20px' }}>
            <label
              className="block uppercase"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.6px',
                marginBottom: '8px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full"
              style={{
                fontSize: '16px',
                color: 'var(--color-text-tertiary)',
                padding: '12px 16px',
                backgroundColor: 'var(--glass-bg-subtle)',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                cursor: 'not-allowed',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--glass-border)', marginBottom: '20px' }} />

          {/* Phone Number (Read-only) */}
          <div style={{ marginBottom: '20px' }}>
            <label
              className="block uppercase"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.6px',
                marginBottom: '8px',
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              disabled
              placeholder="Not set"
              className="w-full"
              style={{
                fontSize: '16px',
                color: 'var(--color-text-tertiary)',
                padding: '12px 16px',
                backgroundColor: 'var(--glass-bg-subtle)',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                cursor: 'not-allowed',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--glass-border)', marginBottom: '20px' }} />

          {/* Default Language */}
          <div style={{ position: 'relative', zIndex: 9999, overflow: 'visible' }}>
            <label
              className="block uppercase"
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.6px',
                marginBottom: '8px',
              }}
            >
              Default Language
            </label>
            <div style={{ marginTop: '8px' }}>
              <LanguageDropdown
                selectedLanguage={selectedLanguage}
                onLanguageSelect={setSelectedLanguage}
                dropDirection="down"
              />
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full transition-all hover:opacity-90 active:scale-98 disabled:opacity-60"
            style={{
              padding: '16px',
              background: loading
                ? 'var(--color-neutral-300)'
                : 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
              boxShadow: loading ? 'none' : 'var(--glass-glow-primary)',
              borderRadius: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </span>
          </button>

          {/* Cancel Button */}
          <button
            onClick={() => router.push('/settings')}
            disabled={loading}
            className="w-full transition-all hover:opacity-90 active:scale-98 disabled:opacity-60 glass"
            style={{
              padding: '16px',
              borderRadius: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              Cancel
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
