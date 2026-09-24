import React, { useState, useContext } from 'react';
import { clientAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './UniteModal.css';

function UniteModal({ client, onClose, onSuccess }) {
  const [uniteName, setUniteName] = useState('');
  const [responsable, setResponsable] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sousTitreName, setSousTitreName] = useState('');
  const [selectedUniteId, setSelectedUniteId] = useState(null);
  const [showAddUnite, setShowAddUnite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isRH, isAdmin } = useContext(AuthContext);

  const unites = client.unites || [];

  // Resolve against the current client prop rather than holding a snapshot, so
  // the sous-titres shown stay in step with the refreshed client after a save.
  const selectedUnite = unites.find(u => u._id === selectedUniteId) || null;

  // Mirrors the backend rule: the next number continues past the highest one in
  // use, so deleting a unite in the middle does not hand out a duplicate.
  const nextUniteNumber = () => {
    const used = unites
      .map(u => parseInt(String(u.uniteNumber || '').split('-').pop(), 10))
      .filter(n => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    return `${client.clientNumber}-${String(next).padStart(3, '0')}`;
  };

  const nextSousTitreRef = (unite) => {
    const used = (unite.sousTitres || [])
      .map(st => parseInt(String(st.refNumber || '').split('-').pop(), 10))
      .filter(n => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    return `${unite.uniteNumber}-${String(next).padStart(2, '0')}`;
  };

  const handleAddUnite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate fields
    if (!uniteName.trim()) {
      setError('Le nom de l\'unité est requis');
      setLoading(false);
      return;
    }
    if (!responsable.trim()) {
      setError('Le responsable est requis');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError('L\'email est requis');
      setLoading(false);
      return;
    }
    if (!phone.trim()) {
      setError('Le téléphone est requis');
      setLoading(false);
      return;
    }

    try {
      await clientAPI.addUnite(client._id, {
        uniteName,
        responsable,
        email,
        phone
      });

      setUniteName('');
      setResponsable('');
      setEmail('');
      setPhone('');
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add unite');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSousTitre = async (e) => {
    e.preventDefault();
    if (!selectedUnite) {
      setError('Veuillez sélectionner une unité');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await clientAPI.addSousTitre(client._id, selectedUnite._id, { name: sousTitreName });

      setSousTitreName('');
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add sous-titre');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnite = async (uniteId) => {
    if (!window.confirm('Supprimer cette unité et tous ses sous-titres?')) return;

    try {
      await clientAPI.deleteUnite(client._id, uniteId);
      onSuccess();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  const handleDeleteSousTitre = async (uniteId, sousTitreId) => {
    if (!window.confirm('Supprimer ce sous-titre?')) return;

    try {
      await clientAPI.deleteSousTitre(client._id, uniteId, sousTitreId);
      onSuccess();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Gérer les Unités - {client.name}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="unite-modal-content">
          {error && <div className="error-message">{error}</div>}

          <div className="client-info-box">
            <div className="info-item">
              <strong>Client:</strong> {client.name}
            </div>
            <div className="info-item">
              <strong>Numéro:</strong> #{client.clientNumber}
            </div>
            <div className="info-item">
              <strong>Unités existantes:</strong> {unites.length}
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="toggle-buttons">
            <button 
              className={showAddUnite ? 'toggle-active' : 'toggle-btn'}
              onClick={() => setShowAddUnite(true)}
              type="button"
            >
              ➕ Ajouter Unité
            </button>
            <button 
              className={!showAddUnite ? 'toggle-active' : 'toggle-btn'}
              onClick={() => setShowAddUnite(false)}
              type="button"
            >
              ➕ Ajouter Sous-titre
            </button>
          </div>

          {/* Add Unite Form */}
          {showAddUnite && (
            <form onSubmit={handleAddUnite} className="add-unite-form">
              <h3>Ajouter une Nouvelle Unité</h3>
              
              <div className="form-group">
                <label>Nom de l'Unité *</label>
                <input
                  type="text"
                  value={uniteName}
                  onChange={(e) => setUniteName(e.target.value)}
                  placeholder="e.g., Cartage"
                  required
                />
                <small className="help-text">
                  Numéro auto: {nextUniteNumber()}
                </small>
              </div>

              <div className="form-group">
                <label>Responsable *</label>
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Nom du responsable"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Téléphone *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-add-unite">
                {loading ? 'Ajout...' : '+ Ajouter Unité'}
              </button>
            </form>
          )}

          {/* Add Sous-titre Form */}
          {!showAddUnite && (
            <form onSubmit={handleAddSousTitre} className="add-unite-form">
              <h3>Ajouter un Sous-titre</h3>

              <div className="form-group">
                <label>Sélectionner l'Unité *</label>
                <select
                  value={selectedUniteId || ''}
                  onChange={(e) => {
                    setSelectedUniteId(e.target.value || null);
                  }}
                  required
                >
                  <option value="">-- Choisir une unité --</option>
                  {unites.map(unite => (
                    <option key={unite._id} value={unite._id}>
                      {unite.uniteNumber} - {unite.uniteName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUnite && (
                <>
                  <div className="form-group">
                    <label>Nom du Sous-titre *</label>
                    <input
                      type="text"
                      value={sousTitreName}
                      onChange={(e) => setSousTitreName(e.target.value)}
                      placeholder="e.g., Port"
                      required
                    />
                    <small className="help-text">
                      Ref auto: {nextSousTitreRef(selectedUnite)}
                    </small>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading || !selectedUnite} className="btn-add-unite">
                {loading ? 'Ajout...' : '+ Ajouter Sous-titre'}
              </button>
            </form>
          )}

          {/* Existing Unites List */}
          {unites.length > 0 && (
            <div className="existing-unites">
              <h3>Structure Existante</h3>
              <div className="unites-tree">
                {unites.map(unite => (
                  <div key={unite._id} className="unite-tree-item">
                    {/* Unite */}
                    <div className="unite-row">
                      <div className="unite-info">
                        <span className="unite-number-large">{unite.uniteNumber}</span>
                        <div className="unite-details">
                          <strong>{unite.uniteName}</strong>
                          <small>Responsable: {unite.responsable}</small>
                          <small>📧 {unite.email}</small>
                          <small>📞 {unite.phone}</small>
                        </div>
                      </div>
                      
                      {(isRH || isAdmin) && (
                        <button
                          onClick={() => handleDeleteUnite(unite._id)}
                          className="btn-delete-unite"
                          title="Supprimer"
                          type="button"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* Sous-titres */}
                    {unite.sousTitres && unite.sousTitres.length > 0 && (
                      <div className="sous-titres-list">
                        {unite.sousTitres.map(sousTitre => (
                          <div key={sousTitre._id} className="sous-titre-row">
                            <div className="sous-titre-info">
                              <span className="sous-titre-ref">{sousTitre.refNumber}</span>
                              <span className="sous-titre-name">{sousTitre.name}</span>
                            </div>
                            {(isRH || isAdmin) && (
                              <button
                                onClick={() => handleDeleteSousTitre(unite._id, sousTitre._id)}
                                className="btn-delete-sous-titre"
                                title="Supprimer"
                                type="button"
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={onClose} className="btn-close-modal" type="button">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UniteModal;