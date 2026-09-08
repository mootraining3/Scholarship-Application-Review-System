import { 
  validateEmail, validateAge, validateGpa, 
  validateTranscript, determineEligibility, determineFinalStatus 
} from './validation.js';

describe('Validation Logic Tests', () => {

  // FR1: Authentication
  test('validateEmail: should accept valid university email', () => {
    expect(validateEmail('user@student.university.edu').ok).toBe(true);
  });
  test('validateEmail: should reject non-university email', () => {
    expect(validateEmail('user@gmail.com').ok).toBe(false);
  });

  // FR3: Age (18-25) - Boundary Value Analysis
  test.each([
    [17, false], [18, true], [25, true], [26, false]
  ])('validateAge(%i) should be %p', (age, expected) => {
    expect(validateAge(age).ok).toBe(expected);
  });

  // FR4: GPA Validation
  test('validateGpa: accept 3.00, reject 2.99 (boundary), reject 4.01 (out of bounds)', () => {
    expect(validateGpa('3.00').ok).toBe(true);
    expect(determineEligibility('3.00')).toBe('Pending');
    expect(determineEligibility('2.99')).toBe('Ineligible'); // FR5 logic
    expect(validateGpa('4.01').ok).toBe(false);
  });

  // FR7: Final Decision Logic - Decision Coverage
  test('determineFinalStatus: branch coverage (>=80 vs <80)', () => {
    expect(determineFinalStatus(80)).toBe('Approved');
    expect(determineFinalStatus(79)).toBe('Rejected');
    expect(() => determineFinalStatus(101)).toThrow(); // Invalid range
  });

  // FR2: Transcript Validation
  test('validateTranscript: reject file > 5MB', () => {
    const file = { name: 'test.pdf', size: 6 * 1024 * 1024 };
    expect(validateTranscript(file).ok).toBe(false);
  });
});