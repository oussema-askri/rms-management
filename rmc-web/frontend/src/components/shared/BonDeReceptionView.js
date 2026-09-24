// frontend/src/components/shared/BonDeReceptionView.js
import React from 'react';
import './BonDeReceptionView.css';

function BonDeReceptionView({ bon, onClose, onRefresh }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content bon-view-modal">
        <div className="modal-header">
          <h2>Bon de Réception - {bon.bonNumber}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="bon-view-content">
          <div className="bon-info-section">
            <h3>Informations</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Client:</strong> {bon.clientName}
              </div>
              <div className="info-item">
                <strong>N° Client:</strong> {bon.clientNumber}
              </div>
              <div className="info-item">
                <strong>Unité:</strong> {bon.unite}
              </div>
              <div className="info-item">
                <strong>N° Unité:</strong> {bon.uniteNumber}
              </div>
              <div className="info-item">
                <strong>Statut:</strong>
                <span style={{
                  marginLeft: '10px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: bon.status === 'active' ? '#C26B1E' : '#27976A'
                }}>
                  {bon.status === 'active' ? 'Actif' : 'Signé'}
                </span>
              </div>
              <div className="info-item">
                <strong>Tâches:</strong> {bon.taches?.length || 0}
              </div>
            </div>
          </div>

          <div className="taches-section">
            {/* taches is absent on bons returned by routes that do not populate
                it, which crashed this view on `.length`. */}
            <h3>Travaux Réalisés ({(bon.taches || []).length})</h3>
            {(bon.taches || []).length === 0 ? (
              <p className="no-data">Aucune tâche complétée</p>
            ) : (
              <div className="taches-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description</th>
                      <th>Matériels</th>
                      <th>Quantité</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* workType was removed from Planning, so the column it fed
                        was always blank. */}
                    {(bon.taches || []).map((tache, index) => (
                      <tr key={tache._id || index}>
                        <td>{index + 1}</td>
                        <td>{tache.description || 'N/A'}</td>
                        <td>{tache.materielsNecessaires || 'N/A'}</td>
                        <td>
                          {tache.quantite} {tache.uniteQuantite}
                        </td>
                        <td>
                          {tache.dateCompleted
                            ? new Date(tache.dateCompleted).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {bon.signedBy && (
            <div className="signature-section">
              <p>
                <strong>Signé par:</strong> {bon.signedBy.name}
              </p>
              <p>
                <strong>Date:</strong> {new Date(bon.signedAt).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-close-modal">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default BonDeReceptionView;