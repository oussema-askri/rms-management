// frontend/src/components/employer/PlanningForm.js
import React, { useState, useEffect } from 'react';
import { planningAPI, rhAPI, clientAPI, unwrapList } from '../../services/api';
import './PlanningForm.css';

function PlanningForm({ onClose, onSuccess, editData }) {
  const [formData, setFormData] = useState({
    client: '',
    clientName: '',
    unite: '',
    uniteNumber: '',
    sousTitre: '',
    sousTitreRef: '',
    description: '',
    materielsNecessaires: '',
    date: '',
    quantite: 1,
    uniteQuantite: 'FTF',
    status: 'pending',
    assignedWorkers: []
  });
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [availableUnites, setAvailableUnites] = useState([]);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [availableSousTitres, setAvailableSousTitres] = useState([]);
  const [distinctMateriels, setDistinctMateriels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchClients();
    fetchMateriels();
    
    if (editData) {
      setFormData({
        ...editData,
        client: editData.client?._id || editData.client || '',
        date: editData.date.split('T')[0],
        quantite: editData.quantite || 1,
        uniteQuantite: editData.uniteQuantite || 'Heures',
        materielsNecessaires: editData.materielsNecessaires || '',
        assignedWorkers: editData.assignedWorkers?.map(w => w._id || w)
      });
      
      if (editData.client) {
        const client = typeof editData.client === 'object' ? editData.client : null;
        if (client) {
          setSelectedClient(client);
          setAvailableUnites(client.unites || []);
        }
      }
    }
  }, [editData]);

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

  const fetchEmployees = async () => {
    try {
      const response = await rhAPI.getEmployees();
      // Responsables work on site too and already appear in the planning
      // calendar, so they must be assignable here as well.
      setEmployees((response.data.data || []).filter(
        emp => emp.isAvailable && ['employer', 'responsable'].includes(emp.role)
      ));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientAPI.getAll();
      setClients(unwrapList(response));
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const client = clients.find(c => c._id === clientId);
    
    setSelectedClient(client);
    setAvailableUnites(client?.unites || []);
    setSelectedUnite(null);
    setAvailableSousTitres([]);
    
    setFormData(prev => ({
      ...prev,
      client: clientId,
      clientName: client?.name || '',
      unite: '',
      uniteNumber: '',
      sousTitre: '',
      sousTitreRef: ''
    }));
  };

  const handleUniteChange = (e) => {
    const uniteId = e.target.value;
    const unite = availableUnites.find(u => u._id === uniteId);
    
    setSelectedUnite(unite);
    setAvailableSousTitres(unite?.sousTitres || []);
    
    setFormData(prev => ({
      ...prev,
      unite: unite?.uniteName || '',
      uniteNumber: unite?.uniteNumber || '',
      sousTitre: '',
      sousTitreRef: ''
    }));
  };

  const handleSousTitreChange = (e) => {
    const sousTitreId = e.target.value;
    const sousTitre = availableSousTitres.find(st => st._id === sousTitreId);
    
    setFormData(prev => ({
      ...prev,
      sousTitre: sousTitre?.name || '',
      sousTitreRef: sousTitre?.refNumber || ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWorkerToggle = (workerId) => {
    setFormData(prev => ({
      ...prev,
      assignedWorkers: prev.assignedWorkers.includes(workerId)
        ? prev.assignedWorkers.filter(id => id !== workerId)
        : [...prev.assignedWorkers, workerId]
    }));
  };

  const handleMaterialClick = (mat) => {
    setFormData(prev => {
      const current = prev.materielsNecessaires ? prev.materielsNecessaires.trim() : '';
      return {
        ...prev,
        materielsNecessaires: current ? `${current}\n${mat}` : mat
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.unite || !formData.client) {
      setError("Vous devez sélectionner un client ET une unité. Si le client n'a pas d'unité, veuillez d'abord en créer une depuis la page Fichier Clients.");
      setLoading(false);
      return;
    }

    try {
      if (editData) {
        await planningAPI.update(editData._id, formData);
      } else {
        await planningAPI.create(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save planning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content planning-modal-large">
        <div className="modal-header">
          <h2>{editData ? 'Modifier Planning' : 'Nouveau Planning'}</h2>
          <button onClick={onClose} className="close-btn" type="button">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="planning-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>🏢 Client & Structure</h3>

            <div className="form-group">
              <label>Client *</label>
              <select
                value={formData.client}
                onChange={handleClientChange}
                required
              >
                <option value="">-- Sélectionner un client --</option>
                {clients?.map(client => (
                  <option key={client._id} value={client._id}>
                    #{client.clientNumber} - {client.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && availableUnites.length > 0 && (
              <div className="form-group">
                <label>Unité *</label>
                <select
                  onChange={handleUniteChange}
                  value={availableUnites.find(u => u.uniteName === formData.unite)?._id || ''}
                  required
                >
                  <option value="">-- Sélectionner une unité --</option>
                  {availableUnites.map(unite => (
                    <option key={unite._id} value={unite._id}>
                      {unite.uniteNumber} - {unite.uniteName} ({unite.responsable})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedUnite && availableSousTitres.length > 0 && (
              <div className="form-group">
                <label>Sous-titre (Optionnel)</label>
                <select
                  onChange={handleSousTitreChange}
                  value={availableSousTitres.find(st => st.name === formData.sousTitre)?._id || ''}
                >
                  <option value="">-- Aucun sous-titre --</option>
                  {availableSousTitres.map(sousTitre => (
                    <option key={sousTitre._id} value={sousTitre._id}>
                      {sousTitre.refNumber} - {sousTitre.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedClient && availableUnites.length === 0 && (
              <div className="warning-message">
                ⚠️ Ce client n'a pas d'unités. Veuillez en ajouter dans le fichier client.
              </div>
            )}

            {formData.uniteNumber && (
              <div className="selection-summary">
                <div className="summary-item">
                  <strong>Client:</strong> {formData.clientName} (#{selectedClient?.clientNumber})
                </div>
                <div className="summary-item">
                  <strong>Unité:</strong> {formData.unite} ({formData.uniteNumber})
                </div>
                {formData.sousTitre && (
                  <div className="summary-item">
                    <strong>Sous-titre:</strong> {formData.sousTitre} ({formData.sousTitreRef})
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>🔧 Détails du Travail</h3>

            {/* REMOVED: Type de Travail */}

            <div className="form-group">
              <label>Description du Travail *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée du travail à effectuer"
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label>🛠️ Matériels Nécessaires</label>
              <textarea
                name="materielsNecessaires"
                value={formData.materielsNecessaires}
                onChange={handleChange}
                placeholder="Ex: Scie, escabeau, peinture... (tapez ou sélectionnez dans l'historique ci-dessous)"
                rows="4"
                style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
              />
              {distinctMateriels.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Historique récent :</span>
                  {distinctMateriels.map((mat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMaterialClick(mat)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        backgroundColor: '#e6f0ff',
                        color: '#0056b3',
                        border: '1px solid #b3d4ff',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#cce0ff'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#e6f0ff'}
                    >
                      + {mat.length > 30 ? mat.substring(0, 30) + '...' : mat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date d'Intervention *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="pending">En Attente</option>
                  <option value="in_progress">En Cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantité *</label>
                <input
                  type="number"
                  name="quantite"
                  value={formData.quantite}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Unité de Quantité *</label>
                <select
                  name="uniteQuantite"
                  value={formData.uniteQuantite}
                  onChange={handleChange}
                  required
                >
                  <option value="FTF">FTF</option>
                  <option value="U">U</option>
                  <option value="ML">ML</option>
                  <option value="M²">M²</option>
                  <option value="H/J">H/J</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>👷 Ouvriers Assignés ({formData.assignedWorkers.length} sélectionné(s))</h3>
            <div className="workers-grid">
              {employees.length === 0 ? (
                <p className="no-data">Aucun ouvrier disponible</p>
              ) : (
                employees.map(emp => (
                  <div 
                    key={emp._id} 
                    className={`worker-card ${formData.assignedWorkers.includes(emp._id) ? 'selected' : ''}`}
                    onClick={() => handleWorkerToggle(emp._id)}
                  >
                    <div className="worker-info">
                      <span className="worker-name">{emp.name}</span>
                      <span className="worker-cin">CIN: {emp.cin}</span>
                    </div>
                    <div className="worker-checkbox">
                      {formData.assignedWorkers.includes(emp._id) && '✓'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Enregistrement...' : editData ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlanningForm;