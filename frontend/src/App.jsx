import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import Modal from './components/Modal.jsx';
import PatientForm from './components/PatientForm.jsx';
import PatientList from './components/PatientList.jsx';

const EMPTY_FILTERS = { search: '', ward: '', department: '', doctor: '', status: '' };

export default function App() {
  const [options, setOptions] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState(null); // { patient: obj | null } when open
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.options().then(setOptions).catch((e) => setLoadError(e.message));
  }, []);

  // Load patients whenever filters change (search is debounced)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await api.list(filters);
        if (!cancelled) { setPatients(data); setLoadError(''); }
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, filters.search ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const reload = () => setRefresh((n) => n + 1);
  const closeForm = useCallback(() => setForm(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const setFilter = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  const isFiltered = Object.values(filters).some((v) => v.trim());

  async function save(body) {
    const editing = form.patient;
    if (editing) await api.update(editing.id, body);
    else await api.create(body);
    setForm(null);
    setToast({ msg: editing ? 'Patient updated' : 'Patient added' });
    reload();
  }

  async function discharge(p) {
    try {
      await api.discharge(p.id);
      setToast({ msg: `${p.name} discharged` });
      reload();
    } catch (e) { setToast({ msg: e.message, bad: true }); }
  }

  async function confirmDelete() {
    const p = deleting;
    setDeleting(null);
    try {
      await api.remove(p.id);
      setToast({ msg: 'Patient deleted' });
      reload();
    } catch (e) { setToast({ msg: e.message, bad: true }); }
  }

  const admitted = patients.filter((p) => p.status === 'Admitted').length;

  return (
    <>
      <header className="top">
        <div>
          <h1>Patient admissions</h1>
          <p className="muted">
            {loading ? 'Loading…' : `${patients.length} ${patients.length === 1 ? 'patient' : 'patients'} · ${admitted} admitted`}
          </p>
        </div>
        <button className="btn primary" disabled={!options} onClick={() => setForm({ patient: null })}>
          Add patient
        </button>
      </header>

      <main>
        <section className="filters" aria-label="Search and filters">
          <input className="search" type="search" name="search" placeholder="Search patients by name"
            aria-label="Search by name" autoComplete="off" value={filters.search} onChange={setFilter} />
          {options && [
            ['ward', 'All wards', options.wards],
            ['department', 'All departments', options.departments],
            ['doctor', 'All doctors', options.doctors],
            ['status', 'All statuses', options.statuses],
          ].map(([name, label, items]) => (
            <select key={name} name={name} aria-label={`Filter by ${name}`} value={filters[name]} onChange={setFilter}>
              <option value="">{label}</option>
              {items.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          ))}
          <button className="btn ghost" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!isFiltered}>
            Clear filters
          </button>
        </section>

        {loadError ? (
          <div className="empty"><strong>Could not load data</strong><p>{loadError}</p></div>
        ) : (
          !loading && (
            <PatientList patients={patients} filtered={isFiltered}
              onEdit={(p) => setForm({ patient: p })} onDischarge={discharge} onDelete={setDeleting} />
          )
        )}
      </main>

      {form && options && (
        <Modal title="Patient form" onClose={closeForm}>
          <PatientForm options={options} patient={form.patient} onSave={save} onClose={closeForm} />
        </Modal>
      )}

      {deleting && (
        <Modal title="Confirm delete" onClose={closeDelete}>
          <div className="confirm">
            <h2>Delete patient?</h2>
            <p>{deleting.name}&apos;s record will be removed permanently. This cannot be undone.</p>
            <div className="actions">
              <button className="btn ghost" onClick={closeDelete}>Keep patient</button>
              <button className="btn danger" onClick={confirmDelete}>Delete patient</button>
            </div>
          </div>
        </Modal>
      )}

      <div id="toast" role="status" className={toast ? `show${toast.bad ? ' bad' : ''}` : ''}>{toast?.msg}</div>
    </>
  );
}
