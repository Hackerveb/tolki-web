'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '@/types';
import { languages } from '@/lib/languages';
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ zIndex: 9999 }}>
      {/* Dropdown Button - NO FLAG, only language name */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
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
          style={{ color: colors.foreground }}
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
              maxHeight: '450px',
              zIndex: 9999,
            }}
          >
            <div className="overflow-y-auto max-h-[450px]">
              {languages.map((language, index) => (
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
                    borderBottom: index < languages.length - 1
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

                  <span className="text-sm font-medium" style={{ color: colors.foreground }}>
                    {language.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

LanguageDropdownComponent.displayName = 'LanguageDropdown';

export const LanguageDropdown = memo(LanguageDropdownComponent);
