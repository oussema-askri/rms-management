// frontend/src/components/rh/AccessRequestForm.js
import React, { useState, useEffect } from 'react';
import { rhAPI, planningAPI } from '../../services/api';
import './AccessRequestForm.css';

function AccessRequestForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    missionDate: '',
    location: '',
    duration: '',
    purpose: '',
    bateau: '',
    materiels: ''
  });
  const [vehicles, setVehicles] = useState([{ type: '', matricule: '' }]);
  const [workers, setWorkers] = useState([{ name: '', cin: '' }]);
  const [employees, setEmployees] = useState([]);
  const [distinctMateriels, setDistinctMateriels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchMateriels();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await rhAPI.getEmployees();
      setEmployees(response.data.data.filter(emp =>
        emp.isAvailable !== false && ['employer', 'responsable'].includes(emp.role)
      ));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchMateriels = async () => {
    try {
      const response = await planningAPI.getDistinctMateriels();
      if (response.data && response.data.success) {
        setDistinctMateriels(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching materiels:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Vehicle handlers ---
  const handleVehicleChange = (index, field, value) => {
    const updated = [...vehicles];
    updated[index][field] = value;
    setVehicles(updated);
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { type: '', matricule: '' }]);
  };

  const removeVehicle = (index) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  // --- Worker handlers ---
  const handleWorkerChange = (index, field, value) => {
    const newWorkers = [...workers];
    newWorkers[index][field] = value;
    setWorkers(newWorkers);
  };

  const addWorker = () => {
    setWorkers([...workers, { name: '', cin: '' }]);
  };

  const removeWorker = (index) => {
    if (workers.length > 1) {
      setWorkers(workers.filter((_, i) => i !== index));
    }
  };

  const selectEmployee = (index, employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    if (employee) {
      const newWorkers = [...workers];
      newWorkers[index] = {
        name: employee.name,
        cin: employee.cin
      };
      setWorkers(newWorkers);
    }
  };

  // --- Materiel autocomplete ---
  const handleMaterialClick = (mat) => {
    setFormData(prev => {
      const current = prev.materiels ? prev.materiels.trim() : '';
      return {
        ...prev,
        materiels: current ? `${current}\n${mat}` : mat
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validWorkers = workers.filter(w => w.name && w.cin);
    if (validWorkers.length === 0) {
      setError('Veuillez ajouter au moins un travailleur');
      setLoading(false);
      return;
    }

    // Filter out empty vehicles
    const validVehicles = vehicles.filter(v => v.type || v.matricule);

    try {
      const dataToSend = {
        ...formData,
        workers: validWorkers,
        vehicles: validVehicles,
        // Also send first vehicle as legacy field for backward compat
        vehicle: validVehicles.length > 0 ? validVehicles[0] : { type: '', matricule: '' }
      };

      await rhAPI.createAccessRequest(dataToSend);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create access request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content access-modal-large">
        <div className="modal-header">
          <h2>Nouvelle Demande d'Accès</h2>
          <button onClick={onClose} className="close-btn" type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="access-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>📋 Informations de la Mission</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Date de Mission *</label>
                <input
                  type="date"
                  name="missionDate"
                  value={formData.missionDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Durée</label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="Ex: 1 jour, 3 heures"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Lieu *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ex: Port de La Goulette"
                required
              />
            </div>

            <div className="form-group">
              <label>Objectif de la Mission</label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Description de l'objectif..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Bateau *</label>
              <input
                type="text"
                name="bateau"
                value={formData.bateau}
                onChange={handleChange}
                placeholder="Ex: M/V Atlantic Star"
                required
              />
            </div>
          </div>

          {/* Matériels Section */}
          <div className="form-section">
            <h3>🛠️ Matériels</h3>

            <div className="form-group">
              <label>Matériels Nécessaires</label>
              <textarea
                name="materiels"
                value={formData.materiels}
                onChange={handleChange}
                placeholder="Ex: Clés à molette, gants, masques... (tapez ou sélectionnez ci-dessous)"
                rows="3"
              />
              {distinctMateriels.length > 0 && (
                <div className="materiels-history">
                  <span className="history-label">Historique récent :</span>
                  <div className="history-chips">
                    {distinctMateriels.map((mat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleMaterialClick(mat)}
                        className="materiel-chip"
                      >
                        + {mat.length > 30 ? mat.substring(0, 30) + '...' : mat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workers Section */}
          <div className="form-section">
            <h3>👷 Personnel Assigné</h3>

            {workers.map((worker, index) => (
              <div key={index} className="worker-row">
                <div className="worker-number">{index + 1}</div>

                <div className="worker-fields">
                  <div className="form-group">
                    <label>Sélectionner Employé</label>
                    <select
                      onChange={(e) => selectEmployee(index, e.target.value)}
                      className="employee-select"
                    >
                      <option value="">-- Choisir un employé --</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} - CIN: {emp.cin}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Nom *</label>
                      <input
                        type="text"
                        value={worker.name}
                        onChange={(e) => handleWorkerChange(index, 'name', e.target.value)}
                        placeholder="Nom complet"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>CIN *</label>
                      <input
                        type="text"
                        value={worker.cin}
                        onChange={(e) => handleWorkerChange(index, 'cin', e.target.value)}
                        placeholder="12345678"
                        required
                      />
                    </div>
                  </div>
                </div>

                {workers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorker(index)}
                    className="btn-remove-worker"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined" style={{fontSize: 16}}>close</span>
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addWorker} className="btn-add-worker">
              + Ajouter un Travailleur
            </button>
          </div>

          {/* Vehicles Section — Multiple */}
          <div className="form-section">
            <h3>🚗 Véhicule(s)</h3>

            {vehicles.map((vehicle, index) => (
              <div key={index} className="vehicle-row">
                <div className="vehicle-number">{index + 1}</div>
                <div className="form-row vehicle-fields">
                  <div className="form-group">
                    <label>Type de Véhicule</label>
                    <input
                      type="text"
                      value={vehicle.type}
                      onChange={(e) => handleVehicleChange(index, 'type', e.target.value)}
                      placeholder="Ex: Camionnette"
                    />
                  </div>
                  <div className="form-group">
                    <label>Matricule</label>
                    <input
                      type="text"
                      value={vehicle.matricule}
                      onChange={(e) => handleVehicleChange(index, 'matricule', e.target.value)}
                      placeholder="Ex: 123 TU 4567"
                    />
                  </div>
                </div>
                {vehicles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVehicle(index)}
                    className="btn-remove-worker"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined" style={{fontSize: 16}}>close</span>
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addVehicle} className="btn-add-worker">
              + Ajouter un Véhicule
            </button>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Création...' : 'Créer Demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccessRequestForm;