// frontend/src/components/rh/EmployeeForm.js
import React, { useState } from 'react';
import { rhAPI } from '../../services/api';
import './EmployeeForm.css';

function EmployeeForm({ onClose, onSuccess, editData }) {
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    email: editData?.email || '',
    password: '',
    role: editData?.role || 'employer',
    cin: editData?.cin || '',
    phone: editData?.phone || '',
    address: editData?.address || '',
    cnss: editData?.cnss || '',
    etatSocial: editData?.etatSocial || '',
    salary: editData?.salary || 0,
    employeeType: editData?.employeeType || 'salarie',
    dailyRate: editData?.dailyRate || 0
  });
  const [photo, setPhoto] = useState(null);
  const [cinImage, setCinImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const handleCinImageChange = (e) => {
    setCinImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Send every field that has a value, including 0 and ''. A truthiness
      // check dropped them, so a salary or daily rate could never be set back
      // to zero and a cleared field silently kept its old value.
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value === undefined || value === null) return;
        // A blank password on edit means "keep the current one".
        if (key === 'password' && value === '') return;
        formDataToSend.append(key, value);
      });

      if (photo) {
        formDataToSend.append('photo', photo);
      }

      if (cinImage) {
        formDataToSend.append('cinImage', cinImage);
      }

      if (editData) {
        await rhAPI.updateEmployee(editData._id, formDataToSend);
      } else {
        await rhAPI.createEmployee(formDataToSend);
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content employee-modal-large">
        <div className="modal-header">
          <h2>{editData ? 'Modifier Employé' : 'Ajouter Employé'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>👤 Informations Personnelles</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Nom Complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Ahmed Ben Ali"
                  required
                />
              </div>

              <div className="form-group">
                <label>CIN *</label>
                <input
                  type="text"
                  name="cin"
                  value={formData.cin}
                  onChange={handleChange}
                  placeholder="Ex: 12345678"
                  required
                  disabled={editData} // Can't change CIN
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  required
                  disabled={editData} // Can't change email
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+216 XX XXX XXX"
                />
              </div>
            </div>

            {!editData && (
              <div className="form-group">
                <label>Mot de Passe *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  required={!editData}
                  minLength="6"
                />
              </div>
            )}

            <div className="form-group">
              <label>Adresse</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Adresse complète"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CNSS</label>
                <input
                  type="text"
                  name="cnss"
                  value={formData.cnss}
                  onChange={handleChange}
                  placeholder="Numéro CNSS"
                />
              </div>

              <div className="form-group">
                <label>État Social</label>
                <select
                  name="etatSocial"
                  value={formData.etatSocial}
                  onChange={handleChange}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>💼 Informations Professionnelles</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Rôle *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="employer">Employé</option>
                  <option value="responsable">Responsable</option>
                  <option value="rh">RH (Ressources Humaines)</option>
                  <option value="comptable">Comptable</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Type d'Employé</label>
                <select
                  name="employeeType"
                  value={formData.employeeType}
                  onChange={handleChange}
                >
                  <option value="salarie">Salarié (fixe mensuel)</option>
                  <option value="taux_journalier">Taux Journalier</option>
                  <option value="prestataire">Prestataire</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Salaire Mensuel (TND)</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              {formData.employeeType === 'taux_journalier' && (
                <div className="form-group">
                  <label>Taux Journalier (TND/jour)</label>
                  <input
                    type="number"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>📷 Documents & Photos</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Photo de Profil</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handlePhotoChange}
                  className="file-input"
                />
                {photo && (
                  <div className="file-preview">
                    📷 {photo.name}
                  </div>
                )}
                {editData?.photo && !photo && (
                  <div className="existing-file">
                    ✅ Photo existante
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Image CIN (Recto/Verso)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleCinImageChange}
                  className="file-input"
                />
                {cinImage && (
                  <div className="file-preview">
                    🆔 {cinImage.name}
                  </div>
                )}
                {editData?.cinImage && !cinImage && (
                  <div className="existing-file">
                    ✅ CIN existant
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Enregistrement...' : editData ? 'Mettre à jour' : 'Créer Employé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;