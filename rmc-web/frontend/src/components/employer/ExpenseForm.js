import React, { useState } from 'react';
import { expenseAPI } from '../../services/api';
import '../employer/PlanningForm.css';

function ExpenseForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paymentMethod: 'espece',
    category: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(selectedFile.type)) {
        setError('Seuls les fichiers JPG, PNG et PDF sont autorisés');
        e.target.value = '';
        return;
      }

      if (selectedFile.size > maxSize) {
        setError('La taille du fichier doit être inférieure à 5 Mo');
        e.target.value = '';
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('description', formData.description);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('paymentMethod', formData.paymentMethod);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('notes', formData.notes);
      if (file) {
        formDataToSend.append('facture', file);
      }

      await expenseAPI.create(formDataToSend);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Échec de la création de la dépense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Nouvelle Dépense</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="planning-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="ex: Achat de pièces moteur"
              required
            />
          </div>

          <div className="form-group">
            <label>Montant (TND) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label>Mode de Paiement *</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              required
            >
              <option value="espece">Espèce</option>
              <option value="virement_bancaire">Virement Bancaire</option>
            </select>
          </div>

          <div className="form-group">
            <label>Catégorie</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {/* Values must stay identical to EXPENSE_CATEGORIES in
                  rms-mobile/src/constants/expenses.js. The mobile app used to
                  store French words here, which split one category into two
                  buckets in the monthly report. */}
              <option value="">Sélectionner une catégorie</option>
              <option value="Materials">Matériaux</option>
              <option value="Tools">Outils</option>
              <option value="Parts">Pièces Bateaux</option>
              <option value="Fuel">Carburant</option>
              <option value="Transport">Transport</option>
              <option value="Meals">Repas</option>
              <option value="Other">Autre</option>
            </select>
          </div>

          <div className="form-group">
            <label>Facture (optionnel — JPG, PNG ou PDF — Max 5 Mo)</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px dashed #ddd',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            />
            {file && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '5px'
              }}>
                <span>📎 {file.name}</span>
                <span style={{ marginLeft: '10px', color: '#999' }}>
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Notes supplémentaires..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Création...' : 'Créer la Dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpenseForm;