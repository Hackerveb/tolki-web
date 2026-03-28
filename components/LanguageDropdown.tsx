'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '@/types';
import { languages, getLanguageByCode } from '@/lib/languages';
import { languageStorage } from '@/utils/languageStorage';

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
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [recentLanguages, setRecentLanguages] = useState<Language[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const recentCodes = languageStorage.getRecentLanguages();
    const langs = recentCodes
      .map(code => getLanguageByCode(code))
      .filter((lang): lang is Language => lang !== undefined);
    setRecentLanguages(langs);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLanguageSelect = (language: Language) => {
    languageStorage.saveRecentLanguage(language.code);
    onLanguageSelect(language);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredLanguages = searchQuery.trim().length > 0
    ? languages.filter(lang => lang.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : languages;

  const displayRecentLanguages = recentLanguages.slice(0, 3);
  const showRecentSection = displayRecentLanguages.length > 0 && searchQuery.trim().length === 0;

  const allItems: Array<{ language: Language; key: string }> = [
    ...(showRecentSection
      ? displayRecentLanguages.map((l) => ({ language: l, key: `recent-${l.code}` }))
      : []),
    ...filteredLanguages.map((l) => ({ language: l, key: l.code })),
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allItems.length) {
          handleLanguageSelect(allItems[focusedIndex].language);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, focusedIndex, allItems]);

  const DeepgramBadge = () => (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}
    >
      HD
    </span>
  );

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ zIndex: 9999 }} onKeyDown={handleKeyDown}>
      {/* ── Trigger button ────────────────────────────────────────── */}
      <motion.button
        onClick={() => { setIsOpen(!isOpen); setFocusedIndex(-1); }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? 'language-listbox' : undefined}
        aria-activedescendant={focusedIndex >= 0 ? `lang-item-${allItems[focusedIndex]?.key}` : undefined}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-2xl flex items-center justify-between"
        style={{
          background: isOpen ? 'var(--glass-bg-strong)' : 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: `1px solid ${isOpen ? 'var(--glass-border-strong)' : 'var(--glass-border)'}`,
          boxShadow: isOpen ? 'var(--glass-shadow)' : 'var(--glass-shadow-sm)',
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '20px',
          paddingRight: '16px',
          transition: 'all 0.15s ease-out',
        }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {selectedLanguage.name}
        </span>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0, marginLeft: '6px' }}
        >
          <polyline points="6 9 12 15 18 9" stroke="var(--color-text-secondary)" strokeWidth={2} />
        </motion.svg>
      </motion.button>

      {/* ── Dropdown menu ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="language-listbox"
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: dropDirection === 'down' ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropDirection === 'down' ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'var(--glass-blur-lg)',
              WebkitBackdropFilter: 'var(--glass-blur-lg)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow-lg)',
              [dropDirection === 'down' ? 'top' : 'bottom']: '52px',
              maxHeight: 'min(450px, 60vh)',
              zIndex: 9999,
            }}
          >
            {/* Search */}
            <div
              className="sticky top-0 px-4 py-3"
              style={{
                background: 'var(--glass-bg-strong)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                borderBottom: '1px solid var(--glass-border-subtle)',
                zIndex: 10,
              }}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setFocusedIndex(-1); }}
                  placeholder="Search languages"
                  aria-label="Search languages"
                  className="w-full text-sm glass-input"
                  style={{
                    color: 'var(--color-text-primary)',
                    borderRadius: '12px',
                    padding: '9px 12px 9px 36px',
                    minHeight: '40px',
                    fontSize: '14px',
                  }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="var(--color-text-tertiary)" strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--color-neutral-200)', border: 'none', cursor: 'pointer' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery.trim().length > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {filteredLanguages.length} {filteredLanguages.length === 1 ? 'language' : 'languages'} found
                </p>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
              {/* Recent section */}
              {showRecentSection && (
                <>
                  <div className="pt-2 pb-1" style={{ paddingLeft: '20px', paddingRight: '16px' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                      Recent
                    </span>
                  </div>
                  {displayRecentLanguages.map((language, index) => {
                    const itemKey = `recent-${language.code}`;
                    const itemIndex = allItems.findIndex((i) => i.key === itemKey);
                    const isFocused = itemIndex === focusedIndex;
                    return (
                      <button
                        key={itemKey}
                        id={`lang-item-${itemKey}`}
                        role="option"
                        aria-selected={selectedLanguage.code === language.code}
                        onClick={() => handleLanguageSelect(language)}
                        onMouseEnter={() => { setHoveredItem(itemKey); setFocusedIndex(itemIndex); }}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="w-full flex items-center gap-3 transition-colors duration-100"
                        style={{
                          background: isFocused || hoveredItem === itemKey ? 'var(--color-primary-alpha)' : 'transparent',
                          paddingTop: '11px', paddingBottom: '11px', paddingLeft: '20px', paddingRight: '16px',
                          borderBottom: index < displayRecentLanguages.length - 1 ? '1px solid var(--glass-border-subtle)' : 'none',
                          outline: isFocused ? '2px solid var(--color-primary)' : 'none',
                          outlineOffset: '-2px',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          {language.name}
                          {language.deepgramSupport && <DeepgramBadge />}
                        </span>
                      </button>
                    );
                  })}
                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 16px 8px' }} />
                </>
              )}

              {/* All languages */}
              {filteredLanguages.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No languages found</p>
                </div>
              ) : (
                filteredLanguages.map((language, index) => {
                  const itemKey = language.code;
                  const itemIndex = allItems.findIndex((i) => i.key === itemKey);
                  const isFocused = itemIndex === focusedIndex;
                  return (
                    <button
                      key={language.code}
                      id={`lang-item-${itemKey}`}
                      role="option"
                      aria-selected={selectedLanguage.code === language.code}
                      onClick={() => handleLanguageSelect(language)}
                      onMouseEnter={() => { setHoveredItem(language.code); setFocusedIndex(itemIndex); }}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="w-full flex items-center gap-3 transition-colors duration-100"
                      style={{
                        background: isFocused || hoveredItem === language.code ? 'var(--color-primary-alpha)' : 'transparent',
                        paddingTop: '11px', paddingBottom: '11px', paddingLeft: '20px', paddingRight: '16px',
                        borderBottom: index < filteredLanguages.length - 1 ? '1px solid var(--glass-border-subtle)' : 'none',
                        outline: isFocused ? '2px solid var(--color-primary)' : 'none',
                        outlineOffset: '-2px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        {language.name}
                        {language.deepgramSupport && <DeepgramBadge />}
                      </span>
                    </button>
                  );
                })
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
