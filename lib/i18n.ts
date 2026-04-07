import type { Locale } from '@/hooks/useLocale';

const translations = {
  // ── Settings page ──────────────────────────────────────────
  'settings.title': { nb: 'Innstillinger', en: 'Settings' },
  'settings.manage': { nb: 'Administrer', en: 'Manage' },
  'settings.upgrade': { nb: 'Oppgrader', en: 'Upgrade' },
  'settings.billing': { nb: 'Fakturahistorikk', en: 'Billing History' },
  'settings.buyCredits': { nb: 'Kjøp minutter', en: 'Buy Minutes' },
  'settings.appearance': { nb: 'Utseende', en: 'Appearance' },
  'settings.darkMode': { nb: 'Mørk modus', en: 'Dark mode' },
  'settings.language': { nb: 'Språk', en: 'Language' },
  'settings.profile': { nb: 'Profil', en: 'Profile' },
  'settings.editProfile': { nb: 'Rediger profil', en: 'Edit Profile' },
  'settings.signOut': { nb: 'Logg ut', en: 'Sign Out' },
  'settings.signOutConfirm': { nb: 'Er du sikker på at du vil logge ut?', en: 'Are you sure you want to sign out?' },
  'settings.deleteAccount': { nb: 'Slett konto', en: 'Delete Account' },
  'settings.deleteWarning': { nb: 'Denne handlingen er permanent og kan ikke angres', en: 'This action is permanent and cannot be undone' },
  'settings.cancel': { nb: 'Avbryt', en: 'Cancel' },
  'settings.organization': { nb: 'Organisasjon', en: 'Organization' },
  'settings.manageOrg': { nb: 'Administrer organisasjon', en: 'Manage organization' },
  'settings.creditsRemaining': { nb: 'gjenværende minutter', en: 'minutes remaining' },
  'settings.lowCredits': { nb: 'Lite minutter', en: 'Low minutes' },
  'settings.goBack': { nb: 'Gå tilbake', en: 'Go back' },

  // ── Main page ──────────────────────────────────────────────
  'main.tapToStart': { nb: 'Trykk for å starte tolking', en: 'Tap to start translating' },
  'main.tapToStop': { nb: 'Trykk for å stoppe. Hold for å pause mikrofonen', en: 'Tap to stop session. Hold to pause microphone' },
  'main.connecting': { nb: 'Kobler til…', en: 'Connecting…' },
  'main.connectionFailed': { nb: 'Tilkobling feilet — prøv igjen', en: 'Connection failed — try again' },
  'main.insufficientCredits': { nb: 'Ikke nok credits', en: 'Insufficient credits' },
  'main.left': { nb: 'igjen', en: 'left' },
  'main.topUp': { nb: 'Fyll på →', en: 'Top up →' },
  'main.micMuted': { nb: 'Mikrofon dempet', en: 'Microphone muted' },
  'main.noAgent': { nb: 'Ingen tolk tilgjengelig. Serveren kan være nede — prøv igjen senere.', en: 'No interpreter agent available. The backend may be offline — please try again later.' },
  'main.agentFailed': { nb: 'Tolken klarte ikke å starte. Prøv igjen senere.', en: 'The interpreter agent failed to start. Please try again later.' },
  'main.connectFailed': { nb: 'Kunne ikke koble til: {msg}. Sjekk mikrofontillatelser.', en: 'Failed to connect: {msg}. Check microphone permissions.' },
  'main.outOfCredits': { nb: 'Du har gått tom for credits. Oppgrader for å fortsette.', en: 'You have run out of credits. Please upgrade to continue.' },
  'main.upgradeNow': { nb: 'Oppgrader nå', en: 'Upgrade now' },
  'main.needCredits': { nb: 'Du trenger minst 0.05 credits for å starte en økt.', en: 'You need at least 0.05 credits to start a session.' },

  // ── Onboarding ─────────────────────────────────────────────
  'onboarding.welcome': { nb: 'Velkommen til TolKI', en: 'Welcome to TolKI' },
  'onboarding.subtitle': { nb: 'AI-drevet tale-til-tale tolking', en: 'AI-powered speech-to-speech interpretation' },
  'onboarding.getStarted': { nb: 'Kom i gang', en: 'Get started' },
  'onboarding.signIn': { nb: 'Logg inn', en: 'Sign in' },
  'onboarding.selectLanguage': { nb: 'Velg språk', en: 'Select language' },

  // ── Subscribe page ─────────────────────────────────────────
  'subscribe.title': { nb: 'Velg abonnementsplan', en: 'Choose subscription plan' },
  'subscribe.tagline': { nb: 'Profesjonell tolkning — alltid tilgjengelig. Én faktura per måned. Ingen bestilling.', en: 'Professional interpretation — always available. One invoice per month. No booking.' },
  'subscribe.monthly': { nb: 'Månedlig', en: 'Monthly' },
  'subscribe.annual': { nb: 'Årlig (-17%)', en: 'Annual (-17%)' },
  'subscribe.recommended': { nb: 'Anbefalt', en: 'Recommended' },
  'subscribe.currentPlan': { nb: 'Gjeldende plan', en: 'Current plan' },
  'subscribe.perMonth': { nb: 'kr/mnd', en: 'NOK/mo' },
  'subscribe.vsMonthly': { nb: 'vs. månedlig', en: 'vs. monthly' },
  'subscribe.alreadyOnPlan': { nb: 'Du er allerede på denne planen', en: 'You are already on this plan' },
  'subscribe.subscribeTo': { nb: 'Abonner på', en: 'Subscribe to' },
  'subscribe.comparison': { nb: 'Plansammenligning', en: 'Plan comparison' },
  'subscribe.annualNote': { nb: 'Faktureres som ett årlig beløp. Kan avsluttes når som helst — gjeldende periode løper ut.', en: 'Billed as a single annual payment. Cancel anytime — current period runs out.' },
  'subscribe.disclaimer': { nb: 'TolKI er ikke egnet for sertifisert rettstolking eller medisinsk tolking der nøyaktighet er juridisk krevd.', en: 'TolKI is not suitable for certified court or medical interpretation where accuracy is legally required.' },
  'subscribe.justNeedMinutes': { nb: 'Trenger du bare ekstra minutter?', en: 'Just need extra minutes?' },
  'subscribe.buyMinutes': { nb: 'Kjøp minutter enkeltvis', en: 'Buy minutes individually' },
  'subscribe.checkoutFailed': { nb: 'Kunne ikke starte betaling. Prøv igjen.', en: 'Could not start payment. Please try again.' },
  'subscribe.orgManagedTitle': { nb: 'Abonnement administrert av organisasjon', en: 'Subscription managed by organization' },
  'subscribe.orgManagedMessage': { nb: 'Ditt abonnement administreres av organisasjonsadministratoren din. Kontakt dem for planendringer.', en: 'Your subscription is managed by your organization admin. Contact them for plan changes.' },
  'subscribe.subscribeForOrg': { nb: 'Abonner for {orgName}', en: 'Subscribe for {orgName}' },

  // ── Credits page ──────────────────────────────────────────
  'credits.orgManagedTitle': { nb: 'Minutter administrert av organisasjon', en: 'Minutes managed by organization' },
  'credits.orgManagedMessage': { nb: 'Minuttene dine administreres av organisasjonsadministratoren din. Kontakt dem for å be om tilgang til ekstra minutter.', en: 'Your minutes are managed by your organization admin. Contact them to request additional minutes.' },

  // ── Common ─────────────────────────────────────────────────
  'common.minutes': { nb: 'minutter', en: 'minutes' },
  'common.hours': { nb: 'timer', en: 'hours' },

  // ── Organisation settings (shared) ────────────────────────
  'org.noOrgSelected': { nb: 'Ingen organisasjon valgt', en: 'No organization selected' },
  'org.createOrJoin': { nb: 'Opprett eller bli med i en organisasjon for å få tilgang til teamfunksjoner.', en: 'Create or join an organization to access team management features.' },
  'org.noActiveSubscription': { nb: 'Ingen aktiv abonnementsplan', en: 'No active subscription' },
  'org.choosePlanForTeam': { nb: 'Velg en plan for å gi teamet ditt tilgang til tolkingsminutter i TolKI.', en: 'Choose a plan to give your team access to TolKI interpretation minutes.' },
  'org.subscribeNow': { nb: 'Abonner nå →', en: 'Subscribe now →' },
  'org.allMinutesUsed': { nb: 'Alle minutter brukt', en: 'All minutes used' },
  'org.allMinutesUsedDesc': { nb: 'Ytterligere bruk faktureres som overforbruk. Oppgrader planen din for å legge til flere minutter.', en: 'Additional usage will be billed as overage. Upgrade your plan to add more minutes.' },
  'org.nearingLimit': { nb: 'Nærmer seg grensen', en: 'Nearing your limit' },
  'org.nearingLimitDesc': { nb: '{pct}% av minuttene gjenstår denne perioden. Vurder å oppgradere.', en: '{pct}% of minutes remaining this cycle. Consider upgrading.' },
  'org.subscription': { nb: 'Abonnement', en: 'Subscription' },
  'org.noActivePlanTeam': { nb: 'Ingen aktiv plan. Abonner for å tildele minutter til teamet ditt.', en: 'No active plan. Subscribe to allocate minutes to your team.' },
  'org.includesRollover': { nb: 'Inkluderer {n} overførte minutter', en: 'Includes {n} rollover minutes' },
  'org.resetsOn': { nb: 'Tilbakestilles {date}', en: 'Resets {date}' },
  'org.creditPoolMode': { nb: 'Kredittspolemodus', en: 'Credit pool mode' },
  'org.sharedPoolDesc': { nb: 'Alle medlemmer deler én minuttspool.', en: 'All members share one minute pool.' },
  'org.individualPoolDesc': { nb: 'Hvert medlem har en individuell minuttkvote.', en: 'Each member has an individual minute allocation.' },
  'org.sharedPool': { nb: 'Delt pool', en: 'Shared pool' },
  'org.individualLimits': { nb: 'Individuelle grenser', en: 'Individual limits' },
  'org.switchToIndividual': { nb: 'Bytt til individuelle grenser', en: 'Switch to set per-member limits' },
  'org.switchToShared': { nb: 'Bytt til delt pool', en: 'Switch to share pool equally' },
  'org.members': { nb: 'Medlemmer', en: 'Members' },
  'org.memberSingular': { nb: 'medlem', en: 'member' },
  'org.memberPlural': { nb: 'medlemmer', en: 'members' },
  'org.usageDashboard': { nb: 'Bruksoversikt', en: 'Usage dashboard' },
  'org.billingPortal': { nb: 'Fakturaportal', en: 'Billing portal' },
  'org.togglePoolMode': { nb: 'Veksle kredittspolemodus', en: 'Toggle credit pool mode' },
  'org.minUsed': { nb: 'min brukt', en: 'min used' },

  // ── Members page ───────────────────────────────────────────
  'org.roleMember': { nb: 'Medlem', en: 'Member' },
  'org.roleAdmin': { nb: 'Administrator', en: 'Admin' },
  'org.invite': { nb: 'Inviter', en: 'Invite' },
  'org.inviteMember': { nb: 'Inviter medlem', en: 'Invite member' },
  'org.emailAddress': { nb: 'E-postadresse', en: 'Email address' },
  'org.role': { nb: 'Rolle', en: 'Role' },
  'org.sendingInvite': { nb: 'Sender invitasjon…', en: 'Sending invite…' },
  'org.sendInvite': { nb: 'Send invitasjon', en: 'Send invite' },
  'org.failedToSendInvite': { nb: 'Kunne ikke sende invitasjon', en: 'Failed to send invite' },
  'org.individualModeInfo': { nb: 'Individuell modus — sett kvoter per bruker nedenfor.', en: 'Individual mode — set per-member allocations below.' },
  'org.noMembers': { nb: 'Ingen medlemmer ennå', en: 'No members yet' },
  'org.inviteTeam': { nb: 'Inviter teamet ditt for å komme i gang.', en: 'Invite your team to get started.' },
  'org.saving': { nb: 'Lagrer…', en: 'Saving…' },
  'org.save': { nb: 'Lagre', en: 'Save' },
  'org.allocation': { nb: 'Tildeling:', en: 'Allocation:' },
  'org.noLimit': { nb: 'Ingen grense', en: 'No limit' },
  'org.edit': { nb: 'Rediger', en: 'Edit' },

  // ── Usage dashboard ────────────────────────────────────────
  'org.thisCycle': { nb: 'Denne perioden', en: 'This cycle' },
  'org.statUsed': { nb: 'brukt', en: 'used' },
  'org.statOverage': { nb: 'overforbruk', en: 'overage' },
  'org.statRemaining': { nb: 'gjenstår', en: 'remaining' },
  'org.statIncluded': { nb: 'inkludert', en: 'included' },
  'org.pctUsed': { nb: '{pct}% brukt', en: '{pct}% used' },
  'org.rolloverStat': { nb: '+{n} overført', en: '+{n} rollover' },
  'org.startedDate': { nb: 'Startet {date}', en: 'Started {date}' },
  'org.resetsDate': { nb: 'Tilbakestilles {date}', en: 'Resets {date}' },
  'org.perMemberUsage': { nb: 'Per-bruker forbruk', en: 'Per-member usage' },
  'org.usageDataUnavailable': { nb: 'Bruksdata ikke tilgjengelig ennå', en: 'Usage data not yet available' },
  'org.usageDataSyncs': { nb: 'Organisasjonsdata synkroniseres automatisk. Kom tilbake etter din første økt eller aktivering av abonnement.', en: 'Organization data syncs automatically. Check back after your first session or subscription activation.' },
  'org.activateSubForMinutes': { nb: 'Aktiver en abonnementsplan for å få inkluderte minutter og se detaljert bruksstatistikk.', en: 'Activate a subscription plan to get included minutes and see detailed usage stats.' },
  'org.overageActive': { nb: 'Overforbruk aktivt', en: 'Overage active' },
  'org.overLimitDesc': { nb: '{n} over grensen.', en: '{n} over limit.' },
  'org.chargedAtRate': { nb: 'Faktureres til {rate} NOK/min på neste faktura.', en: 'Charged at {rate} NOK/min on next invoice.' },

  // ── Billing page ───────────────────────────────────────────
  'billing.title': { nb: 'Abonnement og fakturering', en: 'Subscription & Billing' },
  'billing.loading': { nb: 'Laster...', en: 'Loading...' },
  'billing.currentPlan': { nb: 'Gjeldende plan', en: 'Current plan' },
  'billing.monthlyBilling': { nb: 'Månedlig fakturering', en: 'Monthly billing' },
  'billing.annualBilling': { nb: 'Årlig fakturering', en: 'Annual billing' },
  'billing.billingPeriod': { nb: 'Faktureringsperiode', en: 'Billing period' },
  'billing.overageRate': { nb: 'Overskridelsespris: {rate} kr/min', en: 'Overage rate: {rate} NOK/min' },
  'billing.manageSubscription': { nb: 'Administrer abonnement', en: 'Manage subscription' },
  'billing.changePlan': { nb: 'Endre plan', en: 'Change plan' },
  'billing.noPlan': { nb: 'Ingen aktiv abonnementsplan', en: 'No active subscription plan' },
  'billing.startingFrom': { nb: 'Fra 990 kr/mnd. Ingen bestilling. Ingen ventetid.', en: 'From 990 NOK/mo. No booking. No wait time.' },
  'billing.viewPlans': { nb: 'Se abonnementsplaner', en: 'View subscription plans' },
  'billing.transactionHistory': { nb: 'Transaksjonshistorikk', en: 'Transaction history' },
  'billing.noTransactions': { nb: 'Ingen transaksjoner ennå', en: 'No transactions yet' },
  'billing.purchaseHistoryHere': { nb: 'Kjøpshistorikken din vises her.', en: 'Your purchase history will appear here.' },
  'billing.progressLabel': { nb: '{pct}% av minutter brukt', en: '{pct}% of minutes used' },
  'billing.minutesProgress': { nb: '{used} / {total} min brukt', en: '{used} / {total} min used' },
  'billing.rolloverIncluded': { nb: 'inkl. {n} min overført', en: 'incl. {n} min rollover' },
  'billing.includedPerCycle': { nb: '{n} inkluderte minutter per syklus', en: '{n} included minutes per cycle' },
  'billing.cannotOpenPortal': { nb: 'Kunne ikke åpne faktureringsportalen. Prøv igjen.', en: 'Could not open billing portal. Please try again.' },
  'billing.statusActive': { nb: 'Aktiv', en: 'Active' },
  'billing.statusTrialing': { nb: 'Prøveperiode', en: 'Trial' },
  'billing.statusPastDue': { nb: 'Forfalt', en: 'Past Due' },
  'billing.statusCanceled': { nb: 'Avsluttet', en: 'Cancelled' },
  'billing.txCompleted': { nb: 'Fullført', en: 'Completed' },
  'billing.txPending': { nb: 'Venter', en: 'Pending' },
  'billing.txFailed': { nb: 'Feilet', en: 'Failed' },
  'billing.tierFree': { nb: 'Free', en: 'Free' },
  'billing.tierActive': { nb: 'Aktiv', en: 'Active' },
  'billing.tierEnterprise': { nb: 'Enterprise', en: 'Enterprise' },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale, params?: Record<string, string>): string {
  const entry = translations[key];
  let text: string = entry?.[locale] ?? entry?.['en'] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

// Hook-compatible shorthand
export function useT(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string>) => t(key, locale, params);
}
