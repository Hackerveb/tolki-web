'use client';

import { useEffect } from 'react';
import { useOrganization, useOrganizationList } from '@clerk/nextjs';

/**
 * Auto-activates the user's single organization if they have one and it's not active.
 * Returns { isReady, hasOrg } — isReady means loading is done, hasOrg means an org is/will be active.
 */
export function useAutoSelectOrg() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: listLoaded, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!listLoaded || !orgLoaded) return;
    if (organization) return; // already active

    const memberships = userMemberships?.data;
    if (memberships && memberships.length === 1 && setActive) {
      setActive({ organization: memberships[0].organization.id });
    }
  }, [listLoaded, orgLoaded, organization, userMemberships?.data, setActive]);

  const isLoading = !orgLoaded || !listLoaded;
  const memberships = userMemberships?.data;
  const hasOrg = !!organization || (!!memberships && memberships.length > 0);

  return {
    isReady: !isLoading,
    hasOrg,
    organization,
  };
}
