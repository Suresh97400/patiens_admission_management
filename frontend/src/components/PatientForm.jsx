import { useState } from 'react';
import { ApiError } from '../api';
import { todayStr, validate } from '../validation';

function Field({ label, name, error, full, children }) {
  return (
    <div className={`field${full ? ' full' : ''}${error ? ' invalid' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <small className="err">{error}</small>}
    </div>
  );
}

const blank = () => ({
  name: '', age: '', gender: '', ward: '', department: '', doctor: '',
  admission_date: todayStr(), status: 'Admitted',
});

export default function PatientForm({ options, patient, onSave, onClose }) {
  const editing = Boolean(patient);
  const [values, setValues] = useState(() =>
    patient ? { ...patient, age: String(patient.age) } : blank()
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const select = (name, items, placeholder) => (
    <select id={name} name={name} value={values[name]} onChange={onChange} aria-invalid={Boolean(errors[name])}>
      <option value="">{placeholder}</option>
      {items.map((i) => <option key={i} value={i}>{i}</option>)}
    </select>
  );

  async function submit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      name: values.name.trim(),
      age: Number(values.age),
      gender: values.gender,
      ward: values.ward,
      department: values.department,
      doctor: values.doctor,
      admission_date: values.admission_date,
    };
    if (editing) body.status = values.status;

    setSaving(true);
    try {
      await onSave(body);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      setErrors(Object.keys(fields).length ? fields : { _: err.message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>{editing ? 'Edit patient' : 'Add patient'}</h2>
      {errors._ && <p className="form-error">{errors._}</p>}
      <div className="grid">
        <Field label="Name" name="name" error={errors.name} full>
          <input id="name" name="name" value={values.name} onChange={onChange} maxLength={100}
            autoComplete="off" autoFocus aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Age" name="age" error={errors.age}>
          <input id="age" name="age" type="number" min="0" max="120" step="1" inputMode="numeric"
            value={values.age} onChange={onChange} aria-invalid={Boolean(errors.age)} />
        </Field>
        <Field label="Gender" name="gender" error={errors.gender}>{select('gender', options.genders, 'Select gender')}</Field>
        <Field label="Ward" name="ward" error={errors.ward}>{select('ward', options.wards, 'Select ward')}</Field>
        <Field label="Department" name="department" error={errors.department}>{select('department', options.departments, 'Select department')}</Field>
        <Field label="Doctor" name="doctor" error={errors.doctor}>{select('doctor', options.doctors, 'Select doctor')}</Field>
        <Field label="Admission date" name="admission_date" error={errors.admission_date}>
          <input id="admission_date" name="admission_date" type="date" max={todayStr()}
            value={values.admission_date} onChange={onChange} aria-invalid={Boolean(errors.admission_date)} />
        </Field>
        {editing && (
          <Field label="Status" name="status" error={errors.status} full>
            {select('status', options.statuses, 'Select status')}
          </Field>
        )}
      </div>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save patient'}
        </button>
      </div>
    </form>
  );
}
