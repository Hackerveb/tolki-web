import { Language } from '@/types';

export const languages: Language[] = [
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  { code: 'be', name: 'Belarusian', flag: '🇧🇾' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬', deepgramSupport: true },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸', deepgramSupport: true },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', deepgramSupport: true },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿', deepgramSupport: true },
  { code: 'da', name: 'Danish', flag: '🇩🇰', deepgramSupport: true },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', deepgramSupport: true },
  { code: 'en', name: 'English', flag: '🇬🇧', deepgramSupport: true },
  { code: 'et', name: 'Estonian', flag: '🇪🇪', deepgramSupport: true },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', deepgramSupport: true },
  { code: 'fr', name: 'French', flag: '🇫🇷', deepgramSupport: true },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪', deepgramSupport: true },
  { code: 'el', name: 'Greek', flag: '🇬🇷', deepgramSupport: true },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', deepgramSupport: true },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺', deepgramSupport: true },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩', deepgramSupport: true },
  { code: 'it', name: 'Italian', flag: '🇮🇹', deepgramSupport: true },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', deepgramSupport: true },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', deepgramSupport: true },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻', deepgramSupport: true },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹', deepgramSupport: true },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', deepgramSupport: true },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'mi', name: 'Maori', flag: '🇳🇿' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', deepgramSupport: true },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', deepgramSupport: true },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', deepgramSupport: true },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴', deepgramSupport: true },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', deepgramSupport: true },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰', deepgramSupport: true },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', deepgramSupport: true },
  { code: 'sw', name: 'Swahili', flag: '🇹🇿' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', deepgramSupport: true },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', deepgramSupport: true },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', deepgramSupport: true },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦', deepgramSupport: true },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', deepgramSupport: true },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return languages.find(lang => lang.code === code);
};

/** Returns "🇬🇧 English" — flag emoji prepended to the language name for display. */
export const displayName = (lang: Language): string => `${lang.flag} ${lang.name}`;

export const defaultSourceLanguage = languages.find(l => l.name === 'English')!;
export const defaultTargetLanguage = languages.find(l => l.name === 'Spanish')!;
