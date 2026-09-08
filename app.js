/**
 * app.js
 * UI controller: binds DOM events to validation.js rules.
 * Contains NO business rules — all logic imported from validation.js
 */
import {
  validateEmail, validatePassword,
  validateApplicationForm, determineEligibility,
  validateScore, determineFinalStatus
} from './validation.js';

const DB_KEY = 'sars_applications';
const $ = id => document.getElementById(id);

let currentRole = null;
let currentEmail = null;

/* ---------- Storage helpers ---------- */
const loadDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const saveDB = data => localStorage.setItem(DB_KEY, JSON.stringify(data));

/* ---------- UI helpers ---------- */
function setError(elId, msg) {
  const el = $(elId);
  el.textContent = msg || '';
  el.classList.toggle('show', Boolean(msg));
}

function setAlert(elId, msg, ok) {
  const el = $(elId);
  el.textContent = msg;
  el.className = 'alert ' + (ok ? 'ok' : 'bad');
}

function logEmail(to, subject) {
  const el = $('emailLog');
  el.innerHTML += `<br>[${new Date().toLocaleTimeString()}] TO: ${to} | SUBJECT: ${subject}`;
  el.scrollTop = el.scrollHeight;
}

/* ---------- FR1: Login ---------- */
$('btnLogin').addEventListener('click', () => {
  const emailRes = validateEmail($('email').value);
  const pwdRes = validatePassword($('password').value);

  setError('errEmail', emailRes.msg);
  setError('errPassword', pwdRes.msg);

  if (!emailRes.ok || !pwdRes.ok) {
    setAlert('loginAlert', 'Login failed. Please check your credentials.', false);
    return;
  }

  currentRole = $('role').value;
  currentEmail = $('email').value.trim();

  $('pageLogin').classList.add('hidden');
  $('pageLog').classList.remove('hidden');
  $('nav').classList.remove('hidden');
  $('currentUser').textContent = `${currentEmail} (${currentRole})`;

  if (currentRole === 'applicant') {
    $('pageApplicant').classList.remove('hidden');
  } else {
    $('pageReviewer').classList.remove('hidden');
    renderTable();
  }
});

$('btnLogout').addEventListener('click', () => location.reload());

/* ---------- FR2–FR5: Submit application ---------- */
$('btnSubmitApp').addEventListener('click', () => {
  const formData = {
    fullName: $('fullName').value,
    age: $('age').value,
    gpa: $('gpa').value,
    dob: $('dob').value,
    transcript: $('transcript').files[0] || null
  };

  ['errFullName', 'errAge', 'errGpa', 'errDob', 'errTranscript']
    .forEach(id => setError(id, ''));

  const result = validateApplicationForm(formData);

  if (!result.ok) {
    setError('errFullName', result.errors.fullName);
    setError('errAge', result.errors.age);
    setError('errGpa', result.errors.gpa);
    setError('errDob', result.errors.dob);
    setError('errTranscript', result.errors.transcript);
    setAlert('appAlert', 'Submission failed. Please fix the highlighted fields.', false);
    return;
  }

  const db = loadDB();
  const status = determineEligibility(formData.gpa);
  const record = {
    id: 'APP-' + String(db.length + 1).padStart(3, '0'),
    name: formData.fullName.trim(),
    age: Number(formData.age),
    gpa: parseFloat(formData.gpa).toFixed(2),
    dob: formData.dob || '(missing)',
    email: currentEmail,
    status,
    score: null
  };
  db.push(record);
  saveDB(db);

  if (status === 'Ineligible') {
    logEmail(currentEmail, `[${record.id}] Application Ineligible - GPA below 3.00`);
    setAlert('appAlert', `${record.id} submitted but marked INELIGIBLE (GPA < 3.00).`, false);
  } else {
    logEmail(currentEmail, `[${record.id}] Application Received - Pending Review`);
    setAlert('appAlert', `${record.id} submitted successfully. Status: Pending Review.`, true);
  }
});

$('btnClear').addEventListener('click', () => {
  ['fullName', 'age', 'gpa', 'dob', 'transcript'].forEach(id => ($(id).value = ''));
  ['errFullName', 'errAge', 'errGpa', 'errDob', 'errTranscript'].forEach(id => setError(id, ''));
  $('appAlert').className = 'alert';
});

/* ---------- FR6–FR7: Reviewer scoring ---------- */
function renderTable() {
  const db = loadDB();
  const body = $('appTableBody');

  if (db.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="center">No applications found.</td></tr>';
    return;
  }

  body.innerHTML = db.map((a, i) => `
    <tr data-testid="row-${a.id}">
      <td>${a.id}</td><td>${a.name}</td><td>${a.age}</td><td>${a.gpa}</td>
      <td><span class="badge ${a.status}" data-testid="status-${a.id}">${a.status}</span></td>
      <td data-testid="score-${a.id}">${a.score === null ? '-' : a.score}</td>
      <td>${a.status === 'Pending'
        ? `<input type="number" class="score-input" id="scoreInput-${i}" data-testid="input-score-${a.id}">
           <button class="btn-sm" data-index="${i}" data-testid="btn-score-${a.id}">Save</button>`
        : '<em>Closed</em>'}</td>
    </tr>`).join('');

  body.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', () => submitScore(Number(btn.dataset.index)));
  });
}

function submitScore(index) {
  const raw = $('scoreInput-' + index).value;
  const check = validateScore(raw);

  if (!check.ok) {
    setAlert('revAlert', check.msg, false);
    return;
  }

  const db = loadDB();
  db[index].score = Number(raw);
  db[index].status = determineFinalStatus(raw);
  saveDB(db);

  logEmail(db[index].email, `[${db[index].id}] Final Decision: ${db[index].status} (Score: ${raw})`);
  setAlert('revAlert', `${db[index].id} scored ${raw} → ${db[index].status}. Notification sent.`, true);
  renderTable();
}

$('btnResetData').addEventListener('click', () => {
  localStorage.removeItem(DB_KEY);
  $('emailLog').innerHTML = '[SYSTEM] Test data cleared.';
  if (currentRole === 'reviewer') renderTable();
});