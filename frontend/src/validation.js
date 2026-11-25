// Same rules as backend/schemas.py
export const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

const NAME_RE = /^\p{L}+(?: \p{L}+)*$/u;

export function validate(v) {
  const e = {};

  const name = v.name.trim().replace(/\s+/g, ' ');
  if (!name) e.name = 'Name is required';
  else if (!NAME_RE.test(name)) e.name = 'Name must contain letters only (no numbers or symbols)';
  else if (name.length > 100) e.name = 'Name must be 100 characters or fewer';

  if (String(v.age).trim() === '') e.age = 'Age is required';
  else {
    const n = Number(v.age);
    if (!Number.isFinite(n)) e.age = 'Age must be a number';
    else if (!Number.isInteger(n) || n < 0 || n > 120) e.age = 'Age must be a whole number between 0 and 120';
  }

  [['gender', 'Gender'], ['ward', 'Ward'], ['department', 'Department'], ['doctor', 'Doctor']].forEach(
    ([f, label]) => { if (!v[f]) e[f] = `${label} is required`; }
  );

  if (!v.admission_date) e.admission_date = 'Admission date is required';
  else if (v.admission_date > todayStr()) e.admission_date = 'Admission date cannot be in the future';

  return e;
}
