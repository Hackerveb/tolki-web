import { Language } from '@/types';

const STORAGE_KEY = 'tolki_recently_used_languages';
const MAX_RECENT = 3;

interface RecentLanguagePair {
  sourceCode: string;
  targetCode: string;
  timestamp: number;
}

export const languageStorage = {
  /**
   * Save a language pair to recently used
   */
  saveLanguagePair: (source: Language, target: Language): void => {
    try {
      const existing = languageStorage.getRecentPairs();

      // Remove duplicates (same source-target combo)
      const filtered = existing.filter(
        pair => !(pair.sourceCode === source.code && pair.targetCode === target.code)
      );

      // Add new pair at beginning
      const updated: RecentLanguagePair[] = [
        { sourceCode: source.code, targetCode: target.code, timestamp: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save language pair:', error);
    }
  },

  /**
   * Get recently used language pairs
   */
  getRecentPairs: (): RecentLanguagePair[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const pairs: RecentLanguagePair[] = JSON.parse(stored);

      // Sort by timestamp (newest first)
      return pairs.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT);
    } catch (error) {
      console.error('Failed to get recent pairs:', error);
      return [];
    }
  },

  /**
   * Clear all recently used languages
   */
  clearRecent: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent languages:', error);
    }
  },

  /**
   * Check if a language code appears in recently used
   */
  isRecent: (code: string): boolean => {
    const recent = languageStorage.getRecentPairs();
    return recent.some(pair => pair.sourceCode === code || pair.targetCode === code);
  },
};
