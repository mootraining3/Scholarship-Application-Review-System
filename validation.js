/**
 * validation.js
 * Pure business rules — no DOM, no side effects.
 * Traceability: SRS-2026-001 (FR1–FR7)
 * Testable with Jest / Mocha in Node environment.
 */

export const RULES = Object.freeze({
  AGE_MIN: 18,
  AGE_MAX: 25,
  GPA_MIN: 0.00,
  GPA_MAX: 4.00,
  GPA_ELIGIBLE: 3.00,
  SCORE_MIN: 0,
  SCORE_MAX: 100,
  SCORE_APPROVE: 80,
  FILE_MAX_BYTES: 5 * 1024 * 1024,
  EMAIL_PATTERN: /^[\w.+-]+@(student\.)?university\.edu$/i,
  PASSWORD_MIN: 8
});

/* ---------- FR1: Authentication ---------- */
export function validateEmail(email) {
  const s = String(email ?? '').trim();
  if (s === '') return { ok: false, msg: 'Email is required.' };
  if (!RULES.EMAIL_PATTERN.test(s))
    return { ok: false, msg: 'Invalid email. Use university email.' };
  return { ok: true, msg: '' };
}

export function validatePassword(pwd) {
  const s = String(pwd ?? '');
  if (s.length < RULES.PASSWORD_MIN)
    return { ok: false, msg: `Password must be at least ${RULES.PASSWORD_MIN} characters.` };
  return { ok: true, msg: '' };
}

/* ---------- FR2: Mandatory text field ---------- */
export function validateFullName(name) {
  const s = String(name ?? '').trim();
  if (s === '') return { ok: false, msg: 'Full name is required.' };
  return { ok: true, msg: '' };
}

/* ---------- FR2: Date of Birth ---------- */
export function validateDob(dob) {
  const s = String(dob ?? '').trim();
  if (s === '') return { ok: false, msg: 'Date of Birth is required.' };
  return { ok: true, msg: '' };
}

/* ---------- FR3: Age boundary 18–25 inclusive ---------- */
export function validateAge(age) {
  const s = String(age ?? '').trim();
  if (s === '') return { ok: false, msg: 'Age is required.' };
  if (!/^\d+$/.test(s)) return { ok: false, msg: 'Age must be a whole number.' };
  const n = Number(s);
  if (n < RULES.AGE_MIN || n > RULES.AGE_MAX)
    return { ok: false, msg: `Age must be between ${RULES.AGE_MIN} and ${RULES.AGE_MAX}.` };
  return { ok: true, msg: '' };
}

/* ---------- FR4: GPA format & range 0.00–4.00 ---------- */
export function validateGpa(gpa) {
  const s = String(gpa ?? '').trim();
  if (s === '') return { ok: false, msg: 'GPA is required.' };
  if (!/^\d(\.\d{1,2})?$/.test(s))
    return { ok: false, msg: 'Please enter a valid numeric format (e.g. 3.25).' };
  const n = parseFloat(s);
  if (n < RULES.GPA_MIN || n > RULES.GPA_MAX)
    return { ok: false, msg: `GPA must be between ${RULES.GPA_MIN.toFixed(2)} and ${RULES.GPA_MAX.toFixed(2)}.` };
  return { ok: true, msg: '' };
}

/* ---------- FR2: Transcript upload (PDF ≤ 5MB) ---------- */
export function validateTranscript(file) {
  if (!file) return { ok: false, msg: 'Transcript is required.' };
  if (!String(file.name).toLowerCase().endsWith('.pdf'))
    return { ok: false, msg: 'PDF format only.' };
  if (Number(file.size) > RULES.FILE_MAX_BYTES)
    return { ok: false, msg: 'Maximum size is 5MB.' };
  return { ok: true, msg: '' };
}

/* ---------- FR5: Automated eligibility filtering ---------- */
export function determineEligibility(gpa) {
  return parseFloat(gpa) >= RULES.GPA_ELIGIBLE ? 'Pending' : 'Ineligible';
}

/* ---------- FR6: Reviewer score range ---------- */
export function validateScore(score) {
  const s = String(score ?? '').trim();
  if (s === '') return { ok: false, msg: 'Score is required.' };
  if (!/^-?\d+$/.test(s)) return { ok: false, msg: 'Score must be a whole number.' };
  const n = Number(s);
  if (n < RULES.SCORE_MIN || n > RULES.SCORE_MAX)
    return { ok: false, msg: `Score must be between ${RULES.SCORE_MIN} and ${RULES.SCORE_MAX}.` };
  return { ok: true, msg: '' };
}

/* ---------- FR7: Final decision logic ---------- */
export function determineFinalStatus(score) {
  const v = validateScore(score);
  if (!v.ok) throw new RangeError(v.msg);
  return Number(score) >= RULES.SCORE_APPROVE ? 'Approved' : 'Rejected';
}

/* ---------- Orchestrator: validates whole application form ---------- */
export function validateApplicationForm(data) {
  const errors = {};
  const checks = {
    fullName:   validateFullName(data.fullName),
    age:        validateAge(data.age),
    gpa:        validateGpa(data.gpa),
    // !! SEEDED DEFECT BUG-2026-001 !!
    // FR2 requires DOB to be mandatory, but the check is omitted here.
    // Students must detect this via testing and file a Defect Report.
    // FIX: uncomment the line below.
    // dob:     validateDob(data.dob),
    transcript: validateTranscript(data.transcript)
  };
  for (const [field, res] of Object.entries(checks)) {
    if (!res.ok) errors[field] = res.msg;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}