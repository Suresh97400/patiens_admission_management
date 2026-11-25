const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function PatientList({ patients, filtered, onEdit, onDischarge, onDelete }) {
  if (!patients.length) {
    return (
      <div className="empty">
        <strong>{filtered ? 'No patients match these filters' : 'No patients admitted yet'}</strong>
        <p>{filtered ? 'Try a different name or clear the filters.' : 'Select "Add patient" to register the first admission.'}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th><th>Ward</th><th>Department</th><th>Doctor</th><th>Admitted</th><th>Status</th><th />
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const cls = p.status.toLowerCase();
            return (
              <tr key={p.id} className={cls}>
                <td data-label="Patient">
                  <div>
                    <span className="pname">{p.name}</span>
                    <div className="sub">{p.age} yrs, {p.gender}</div>
                  </div>
                </td>
                <td data-label="Ward">{p.ward}</td>
                <td data-label="Department">{p.department}</td>
                <td data-label="Doctor">{p.doctor}</td>
                <td data-label="Admitted">{fmtDate(p.admission_date)}</td>
                <td data-label="Status"><span className={`badge ${cls}`}>{p.status}</span></td>
                <td className="actions">
                  <button className="btn small" onClick={() => onEdit(p)}>Edit</button>
                  {p.status === 'Admitted' && (
                    <button className="btn small" onClick={() => onDischarge(p)}>Discharge</button>
                  )}
                  <button className="btn small del" onClick={() => onDelete(p)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
