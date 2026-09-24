import React, { useState, useEffect } from 'react';
import { pointageAPI } from '../../services/api';
import './PointageForm.css';

function PointageForm() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [message, setMessage] = useState(null);

  // Load employees list once
  useEffect(() => {
    pointageAPI.getEmployees().then(res => setAllEmployees(res.data.data)).catch(() => {});
  }, []);

  // Load data when date changes
  useEffect(() => {
    if (!date) return;
    loadDateData();
  }, [date]);

  const loadDateData = async () => {
    setLoading(true);
    setSaved(false);
    setMessage(null);
    try {
      // Check if pointage already exists for this date
      const myRes = await pointageAPI.getMy(date);
      if (myRes.data.data) {
        setEntries(myRes.data.data.entries);
        setSaved(true);
        setLoading(false);
        return;
      }

      // Otherwise load from planning
      const planRes = await pointageAPI.getPlanningForDate(date);
      const plannings = planRes.data.data || [];

      const newEntries = [];
      const seenWorkers = new Set();

      plannings.forEach(p => {
        (p.assignedWorkers || []).forEach(w => {
          if (!seenWorkers.has(w._id)) {
            seenWorkers.add(w._id);
            newEntries.push({
              worker: w._id,
              workerName: w.name,
              status: 'present',
              absentReason: '',
              clientName: p.client?.name || p.clientName || '',
              unite: p.unite || '',
              planning: p._id,
              notes: '',
            });
          }
        });
      });

      setEntries(newEntries);
    } catch (error) {
      console.error('Error loading date data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await pointageAPI.getDuplicate(date);
      if (res.data.data && res.data.data.entries?.length > 0) {
        // Copy entries but reset notes
        const duplicated = res.data.data.entries.map(e => ({
          worker: e.worker,
          workerName: e.workerName,
          status: 'present',
          absentReason: '',
          clientName: e.clientName || '',
          unite: e.unite || '',
          planning: null,
          notes: '',
        }));
        setEntries(duplicated);
        setSaved(false);
        setMessage({ type: 'info', text: `Pointage dupliqué depuis le ${new Date(res.data.data.date).toLocaleDateString('fr-FR')}` });
      } else {
        setMessage({ type: 'warning', text: 'Aucun pointage précédent trouvé' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la duplication' });
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'status' && value === 'present') {
        updated[index].absentReason = '';
      }
      return updated;
    });
    setSaved(false);
  };

  const removeEntry = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const addWorker = (employee) => {
    if (entries.find(e => e.worker === employee._id)) {
      setMessage({ type: 'warning', text: 'Cet employé est déjà dans la liste' });
      return;
    }
    setEntries(prev => [...prev, {
      worker: employee._id,
      workerName: employee.name,
      status: 'present',
      absentReason: '',
      clientName: '',
      unite: '',
      planning: null,
      notes: '',
    }]);
    setShowAddWorker(false);
    setSaved(false);
  };

  const handleSave = async () => {
    if (entries.length === 0) {
      setMessage({ type: 'warning', text: 'Ajoutez au moins un employé' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await pointageAPI.save({ date, entries });
      setSaved(true);
      setMessage({ type: 'success', text: 'Pointage enregistré avec succès!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const availableEmployees = allEmployees.filter(emp =>
    !entries.find(e => e.worker === emp._id)
  );

  const statusCounts = {
    present: entries.filter(e => e.status === 'present').length,
    absent: entries.filter(e => e.status === 'absent').length,
    late: entries.filter(e => e.status === 'late').length,
  };

  return (
    <div className="pointage-form">
      {/* Controls */}
      <div className="pointage-controls">
        <div className="pointage-date-picker">
          <label>Date du pointage</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="pointage-actions">
          <button className="btn-duplicate" onClick={handleDuplicate} disabled={loading}>
            Dupliquer jour précédent
          </button>
          <button className="btn-add-worker" onClick={() => setShowAddWorker(!showAddWorker)}>
            + Ajouter employé
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`pointage-message pointage-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      {entries.length > 0 && (
        <div className="pointage-stats">
          <div className="pointage-stat stat-total">
            <span className="stat-number">{entries.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="pointage-stat stat-present">
            <span className="stat-number">{statusCounts.present}</span>
            <span className="stat-label">Présents</span>
          </div>
          <div className="pointage-stat stat-late">
            <span className="stat-number">{statusCounts.late}</span>
            <span className="stat-label">Retard</span>
          </div>
          <div className="pointage-stat stat-absent">
            <span className="stat-number">{statusCounts.absent}</span>
            <span className="stat-label">Absents</span>
          </div>
        </div>
      )}

      {/* Add Worker Dropdown */}
      {showAddWorker && (
        <div className="add-worker-dropdown">
          <h4>Sélectionner un employé</h4>
          {availableEmployees.length === 0 ? (
            <p className="no-employees">Tous les employés sont déjà ajoutés</p>
          ) : (
            <div className="employee-options">
              {availableEmployees.map(emp => (
                <button key={emp._id} className="employee-option" onClick={() => addWorker(emp)}>
                  <span className="emp-name">{emp.name}</span>
                  <span className="emp-type">{emp.employeeType || emp.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="pointage-loading">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      )}

      {/* Entries Table */}
      {!loading && entries.length === 0 && (
        <div className="pointage-empty">
          <p>Aucun employé planifié pour cette date.</p>
          <p>Utilisez "Ajouter employé" ou "Dupliquer jour précédent" pour commencer.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="pointage-table-wrap">
          <table className="pointage-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Statut</th>
                <th>Client</th>
                <th>Unité</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.worker + '-' + idx} className={`entry-row entry-${entry.status}`}>
                  <td className="entry-worker">
                    <span className="worker-name">{entry.workerName}</span>
                  </td>
                  <td className="entry-status">
                    <div className="status-buttons">
                      <button
                        className={`status-btn status-present ${entry.status === 'present' ? 'active' : ''}`}
                        onClick={() => updateEntry(idx, 'status', 'present')}
                        title="Présent"
                      >P</button>
                      <button
                        className={`status-btn status-late ${entry.status === 'late' ? 'active' : ''}`}
                        onClick={() => updateEntry(idx, 'status', 'late')}
                        title="En retard"
                      >R</button>
                      <button
                        className={`status-btn status-absent ${entry.status === 'absent' ? 'active' : ''}`}
                        onClick={() => updateEntry(idx, 'status', 'absent')}
                        title="Absent"
                      >A</button>
                    </div>
                    {entry.status === 'absent' && (
                      <input
                        type="text"
                        placeholder="Raison d'absence"
                        className="absent-reason"
                        value={entry.absentReason}
                        onChange={e => updateEntry(idx, 'absentReason', e.target.value)}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className="entry-input"
                      value={entry.clientName}
                      onChange={e => updateEntry(idx, 'clientName', e.target.value)}
                      placeholder="Client"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="entry-input"
                      value={entry.unite}
                      onChange={e => updateEntry(idx, 'unite', e.target.value)}
                      placeholder="Unité"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="entry-input"
                      value={entry.notes}
                      onChange={e => updateEntry(idx, 'notes', e.target.value)}
                      placeholder="Notes"
                    />
                  </td>
                  <td>
                    <button className="btn-remove-entry" onClick={() => removeEntry(idx)} title="Retirer">
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
      {!loading && entries.length > 0 && (
        <div className="pointage-save-section">
          <button
            className={`btn-save-pointage ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : saved ? 'Enregistré' : 'Enregistrer le pointage'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PointageForm;
