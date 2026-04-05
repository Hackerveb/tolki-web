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

  // ── Common ─────────────────────────────────────────────────
  'common.minutes': { nb: 'minutter', en: 'minutes' },
  'common.hours': { nb: 'timer', en: 'hours' },
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
