'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '@/types';
import { languages, getLanguageByCode } from '@/lib/languages';
import { languageStorage } from '@/utils/languageStorage';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

interface LanguageDropdownProps {
  selectedLanguage: Language;
  onLanguageSelect: (language: Language) => void;
  dropDirection?: 'up' | 'down';
  className?: string;
}

const LanguageDropdownComponent: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onLanguageSelect,
  dropDirection = 'up',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [recentPairs, setRecentPairs] = useState<Array<{ source: Language | undefined; target: Language | undefined }>>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent pairs on mount
  useEffect(() => {
    const pairs = languageStorage.getRecentPairs().map(pair => ({
      source: getLanguageByCode(pair.sourceCode),
      target: getLanguageByCode(pair.targetCode),
    }));
    setRecentPairs(pairs);
  }, [isOpen]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (language: Language) => {
    // Immediate selection for better performance
    onLanguageSelect(language);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim().length > 0
    ? languages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  // Get unique recent languages (exclude duplicates) - limit to 2
  const uniqueRecentLanguages = Array.from(
    new Map(
      recentPairs
        .flatMap(pair => [pair.source, pair.target])
        .filter((lang): lang is Language => lang !== undefined)
        .map(lang => [lang.code, lang])
    ).values()
  ).slice(0, 2);

  const showRecentSection = uniqueRecentLanguages.length > 0 && searchQuery.trim().length === 0;

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ zIndex: 9999 }}>
      {/* Dropdown Button - NO FLAG, only language name */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        whileTap={{ scale: 0.98 }}
        className="w-full px-4 rounded-[20px] flex items-center justify-between"
        style={{
          backgroundColor: colors.background,
          boxShadow: isOpen ? shadows.pressed.boxShadow : shadows.subtle.boxShadow,
          paddingTop: '14px',
          paddingBottom: '14px',
        }}
      >
        <span
          className="text-sm font-medium"
          style={{ color: colors.foreground, paddingLeft: '8px' }}
        >
          {selectedLanguage.name}
        </span>

        {/* Arrow Icon */}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <polyline
            points="6 9 12 15 18 9"
            stroke={colors.foreground}
            strokeWidth={2}
          />
        </motion.svg>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropDirection === 'down' ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dropDirection === 'down' ? -5 : 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.background,
              boxShadow: shadows.elevated.boxShadow,
              [dropDirection === 'down' ? 'top' : 'bottom']: '50px',
              maxHeight: 'min(450px, 60vh)',
              zIndex: 9999,
            }}
          >
            {/* Search Input */}
            <div
              className="sticky top-0 px-4 py-3"
              style={{
                backgroundColor: colors.background,
                borderBottom: `1px solid ${colors.silverAlpha(0.2)}`,
                zIndex: 10,
              }}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search languages"
                  aria-label="Search languages"
                  className="w-full text-sm"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    boxShadow: shadows.pressed.boxShadow,
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 12px 8px 36px',
                    minHeight: '40px',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                {/* Search Icon */}
                <div
                  className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ width: '20px', height: '20px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke={colors.muted} strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                {/* Clear button */}
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{
                      backgroundColor: colors.silverAlpha(0.2),
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke={colors.muted}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {/* Match count */}
              {searchQuery.trim().length > 0 && (
                <p
                  className="text-xs mt-2"
                  style={{ color: colors.silverAlpha(0.7) }}
                >
                  {filteredLanguages.length} {filteredLanguages.length === 1 ? 'language' : 'languages'} match
                </p>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
              {/* Recently Used Section */}
              {showRecentSection && (
                <>
                  <div
                    className="px-4 py-3 flex items-center justify-center"
                    style={{
                      backgroundColor: colors.blueAlpha(0.05),
                    }}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: colors.blueMunsell }}
                    >
                      Recently Used
                    </span>
                  </div>
                  {uniqueRecentLanguages.map((language, index) => (
                    <button
                      key={`recent-${language.code}`}
                      onClick={() => handleLanguageSelect(language)}
                      onMouseEnter={() => setHoveredItem(`recent-${language.code}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="w-full px-4 flex items-center gap-3 relative overflow-hidden transition-all duration-150"
                      style={{
                        backgroundColor: hoveredItem === `recent-${language.code}`
                          ? colors.blueAlpha(0.1)
                          : colors.blueAlpha(0.05),
                        paddingLeft: hoveredItem === `recent-${language.code}` ? '24px' : '16px',
                        paddingTop: '12px',
                        paddingBottom: '12px',
                        borderBottom: index < uniqueRecentLanguages.length - 1
                          ? `1px solid ${colors.silverAlpha(0.1)}`
                          : 'none',
                      }}
                    >
                      {/* Blue indicator line */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] transition-transform duration-150"
                        style={{
                          backgroundColor: colors.blueMunsell,
                          transform: hoveredItem === `recent-${language.code}` ? 'translateX(0)' : 'translateX(-3px)'
                        }}
                      />

                      <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: colors.foreground }}>
                        {language.name}
                        {language.deepgramSupport && (
                          <span
                            className="text-xs"
                            style={{ color: colors.blueMunsell }}
                            title="High-performance Deepgram STT"
                          >
                            ⚡
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: colors.silverAlpha(0.3),
                      margin: '8px 0',
                    }}
                  />
                </>
              )}

              {/* All Languages List */}
              {filteredLanguages.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: colors.muted }}>
                    No languages match
                  </p>
                </div>
              ) : (
                filteredLanguages.map((language, index) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageSelect(language)}
                    onMouseEnter={() => setHoveredItem(language.code)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="w-full px-4 flex items-center gap-3 relative overflow-hidden transition-all duration-150"
                    style={{
                      backgroundColor: hoveredItem === language.code
                        ? colors.blueAlpha(0.1)
                        : 'transparent',
                      paddingLeft: hoveredItem === language.code ? '24px' : '16px',
                      paddingTop: '14px',
                      paddingBottom: '14px',
                      borderBottom: index < filteredLanguages.length - 1
                        ? `1px solid ${colors.silverAlpha(0.2)}`
                        : 'none',
                    }}
                  >
                    {/* Blue indicator line */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px] transition-transform duration-150"
                      style={{
                        backgroundColor: colors.blueMunsell,
                        transform: hoveredItem === language.code ? 'translateX(0)' : 'translateX(-3px)'
                      }}
                    />

                    <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: colors.foreground }}>
                      {language.name}
                      {language.deepgramSupport && (
                        <span
                          className="text-xs"
                          style={{ color: colors.blueMunsell }}
                          title="High-performance Deepgram STT"
                        >
                          ⚡
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

LanguageDropdownComponent.displayName = 'LanguageDropdown';

export const LanguageDropdown = memo(LanguageDropdownComponent);
