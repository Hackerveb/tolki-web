'use client';

import { useEffect, useRef } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

export const useCurrentUser = () => {
  const { isLoaded, isSignedIn, user: clerkUser } = useClerkUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const hasSyncedRef = useRef<string | null>(null);

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserDetails,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  // Sync Clerk user with Convex on sign in (only once per user session)
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser && hasSyncedRef.current !== clerkUser.id) {
      const syncUser = async () => {
        try {
          await createOrUpdateUser({
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
                  clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User',
          });
          // Mark this user as synced to prevent redundant calls
          hasSyncedRef.current = clerkUser.id;
        } catch (error) {
          console.error('Error syncing user with Convex:', error);
        }
      };

      syncUser();
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const fullName = clerkUser ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() : '';
  const displayName = fullName || clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress || '';
  const initials = clerkUser ?
    `${clerkUser.firstName?.[0] || ''}${clerkUser.lastName?.[0] || ''}`.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    'U' : 'U';

  return {
    isLoaded,
    isSignedIn,
    clerkUser,
    convexUser,
    fullName,
    displayName,
    email,
    initials,
    profileImageUrl: clerkUser?.imageUrl,
    credits: convexUser?.credits ?? 0,
    activeSession: convexUser?.activeSession,
    recentPurchases: convexUser?.recentPurchases ?? [],
  };
};
