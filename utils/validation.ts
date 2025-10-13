/**
 * Validation utilities for email and password
 */

// Email validation regex - RFC 5322 compliant (simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface PasswordStrength {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return {
      isValid: false,
      message: 'Email is required',
    };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Validates password strength and returns detailed feedback
 */
export const validatePassword = (password: string): PasswordStrength => {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  // Check for uppercase letter
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter (A-Z)');
  }

  // Check for lowercase letter
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter (a-z)');
  }

  // Check for number
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('One number (0-9)');
  }

  // Check for special character
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('One special character (!@#$%...)');
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    strength = password.length >= 12 ? 'strong' : 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Quick check if email is valid (for form validation)
 */
export const isEmailValid = (email: string): boolean => {
  return validateEmail(email).isValid;
};

/**
 * Quick check if password is valid (for form validation)
 */
export const isPasswordValid = (password: string): boolean => {
  return validatePassword(password).isValid;
};

/**
 * Get password strength color for UI
 */
export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return '#FF6B6B'; // Red
    case 'medium':
      return '#FFA726'; // Orange
    case 'strong':
      return '#66BB6A'; // Green
  }
};

/**
 * Get password requirements list (for display)
 */
export const getPasswordRequirementsList = (): string[] => {
  return [
    `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    'One uppercase letter (A-Z)',
    'One lowercase letter (a-z)',
    'One number (0-9)',
    'One special character (!@#$%...)',
  ];
};
