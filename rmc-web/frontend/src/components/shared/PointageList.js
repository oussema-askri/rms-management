import React, { useState, useEffect } from 'react';
import { pointageAPI } from '../../services/api';
import './PointageForm.css';

function PointageList() {
  const [pointages, setPointages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedPointage, setSelectedPointage] = useState(null);

  useEffect(() => {
    fetchPointages();
  }, [month]);

  const fetchPointages = async () => {
    setLoading(true);
    try {
      const res = await pointageAPI.getAll({ month });
      setPointages(res.data.data || []);
    } catch (error) {
      console.error('Error fetching pointages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce pointage ?')) return;
    try {
      await pointageAPI.delete(id);
      setPointages(prev => prev.filter(p => p._id !== id));
      if (selectedPointage?._id === id) setSelectedPointage(null);
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  const getStatusBadge = (status) => {
    const styles = {
      present: { background: '#e8f4ee', color: '#165a3d' },
      absent: { background: '#ffdad6', color: '#6e1e1e' },
      late: { background: '#faf0e6', color: '#773f11' },
    };
    const labels = { present: 'Pr\u00e9sent', absent: 'Absent', late: 'Retard' };
    const s = styles[status] || styles.present;
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
        fontSize: '12px', fontWeight: 600, ...s
      }}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="pointage-form">
      {/* Controls */}
      <div className="pointage-controls">
        <div className="pointage-date-picker">
          <label>Mois</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      {/* Back to list button when viewing detail */}
      {selectedPointage && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-duplicate" onClick={() => setSelectedPointage(null)}>
            &larr; Retour a la liste
          </button>
        </div>
      )}

      {/* Detail View */}
      {selectedPointage && (
        <div className="pointage-table-wrap">
          <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1a2435' }}>
              Pointage du {formatDate(selectedPointage.date)}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Par: {selectedPointage.createdBy?.name || selectedPointage.createdByName}
            </p>
          </div>
          <table className="pointage-table">
            <thead>
              <tr>
                <th>Employe</th>
                <th>Statut</th>
                <th>Client</th>
                <th>Unite</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {selectedPointage.entries?.map((entry, idx) => (
                <tr key={idx} className={`entry-row entry-${entry.status}`}>
                  <td><span className="worker-name">{entry.workerName}</span></td>
                  <td>
                    {getStatusBadge(entry.status)}
                    {entry.status === 'absent' && entry.absentReason && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        {entry.absentReason}
                      </div>
                    )}
                  </td>
                  <td>{entry.clientName || '-'}</td>
                  <td>{entry.unite || '-'}</td>
                  <td>{entry.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* List View */}
      {!selectedPointage && (
        <>
          {loading ? (
            <div className="pointage-loading">
              <div className="spinner"></div>
              <p>Chargement...</p>
            </div>
          ) : pointages.length === 0 ? (
            <div className="pointage-empty">
              <p>Aucun pointage pour ce mois.</p>
            </div>
          ) : (
            <div className="pointage-table-wrap">
              <table className="pointage-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Responsable</th>
                    <th>Presents</th>
                    <th>Absents</th>
                    <th>Retards</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pointages.map(p => {
                    const presents = p.entries?.filter(e => e.status === 'present').length || 0;
                    const absents = p.entries?.filter(e => e.status === 'absent').length || 0;
                    const lates = p.entries?.filter(e => e.status === 'late').length || 0;
                    return (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 600 }}>{formatDate(p.date)}</td>
                        <td>{p.createdBy?.name || p.createdByName}</td>
                        <td>
                          <span style={{ color: '#27976a', fontWeight: 600 }}>{presents}</span>
                        </td>
                        <td>
                          <span style={{ color: '#b53535', fontWeight: 600 }}>{absents}</span>
                        </td>
                        <td>
                          <span style={{ color: '#c26b1e', fontWeight: 600 }}>{lates}</span>
                        </td>
                        <td>{p.entries?.length || 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-duplicate"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setSelectedPointage(p)}
                            >
                              Voir
                            </button>
                            <button
                              className="btn-remove-entry"
                              style={{ width: 24, height: 24, fontSize: 14 }}
                              onClick={() => handleDelete(p._id)}
                              title="Supprimer"
                            >
                              &times;
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PointageList;
