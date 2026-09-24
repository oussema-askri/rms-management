import React, { useState, useContext } from 'react';
import { clientAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './ClientForm.css';

function ClientForm({ onClose, onSuccess, editData }) {
  const { isEmployer } = useContext(AuthContext);
  
  // Initialize all hooks FIRST (before any returns)
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    email: editData?.email || '',
    address: editData?.address || '',
    telephone: editData?.telephone || '',
    departement: editData?.departement || '',
    tvaPercentage: editData?.tvaPercentage || 19,
    modePaiement: editData?.modePaiement || 'Virement',
    devise: editData?.devise || 'TND'
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // NOW check permissions AFTER hooks are initialized
  if (isEmployer && editData) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Accès Refusé</h2>
            <button onClick={onClose} className="close-btn">&times;</button>
          </div>
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', margin: '20px 0' }}>⛔</p>
            <h3>Permission Refusée</h3>
            <p>Les employeurs ne peuvent pas modifier les clients.</p>
            <p>Seuls les RH et Admins peuvent modifier.</p>
            <button onClick={onClose} className="btn-submit" style={{ marginTop: '20px' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add all fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Add files
      files.forEach(file => {
        formDataToSend.append('pieceJointe', file);
      });

      if (editData) {
        await clientAPI.update(editData._id, formDataToSend);
      } else {
        await clientAPI.create(formDataToSend);
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>{editData ? 'Modifier Client' : 'Nouveau Client'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="client-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Informations Générales</h3>
            
            <div className="form-group">
              <label>Nom du Client *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., CTN"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="client@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="text"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="+216 XX XXX XXX"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Adresse *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Adresse complète"
                required
              />
            </div>

            <div className="form-group">
              <label>Département *</label>
              <input
                type="text"
                name="departement"
                value={formData.departement}
                onChange={handleChange}
                placeholder="e.g., Maritime"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Informations Financières</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>TVA (%)</label>
                <input
                  type="number"
                  name="tvaPercentage"
                  value={formData.tvaPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Devise</label>
                <select
                  name="devise"
                  value={formData.devise}
                  onChange={handleChange}
                >
                  <option value="TND">TND - Dinar Tunisien</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Mode de Paiement</label>
              <select
                name="modePaiement"
                value={formData.modePaiement}
                onChange={handleChange}
              >
                <option value="Espèce">Espèce</option>
                <option value="Chèque">Chèque</option>
                <option value="Virement">Virement</option>
                <option value="Effet">Effet</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Documents (Certificats, etc.)</h3>
            
            <div className="form-group">
              <label>Pièces Jointes (Max 5 fichiers)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="file-input"
              />
              {files.length > 0 && (
                <div className="files-preview">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editData?.pieceJointe && editData.pieceJointe.length > 0 && (
              <div className="existing-files">
                <h4>Fichiers Existants:</h4>
                {editData.pieceJointe.map((file, index) => (
                  <div key={index} className="file-item">
                    📄 {file.fileName}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Enregistrement...' : editData ? 'Mettre à jour' : 'Créer Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientForm;