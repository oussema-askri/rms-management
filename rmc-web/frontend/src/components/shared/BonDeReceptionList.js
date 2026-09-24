// frontend/src/components/shared/BonDeReceptionList.js
import React, { useState, useEffect, useContext } from 'react';
import { bonDeReceptionAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import BonDeReceptionView from './BonDeReceptionView';
import './BonDeReceptionList.css';
import { openFile } from '../../services/files';

function BonDeReceptionList() {
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBon, setSelectedBon] = useState(null);
  const [showView, setShowView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isRH, isAdmin } = useContext(AuthContext);

  useEffect(() => {
    fetchBons();
  }, []);

  const fetchBons = async () => {
    try {
      const response = await bonDeReceptionAPI.getAll();
      setBons(response.data.data);
    } catch (error) {
      console.error('Error fetching Bons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (bon) => {
    setSelectedBon(bon);
    setShowView(true);
  };

  const handleSign = async (bonId) => {
    if (!window.confirm('Signer ce Bon de Réception? Cette action est irréversible.')) return;
    try {
      await bonDeReceptionAPI.sign(bonId);
      alert('✅ Bon de Réception signé avec succès!');
      fetchBons();
    } catch (error) {
      alert(error.response?.data?.message || 'Échec de la signature');
    }
  };

  const handleDelete = async (bonId) => {
    if (!window.confirm('⚠️ Supprimer ce Bon de Réception? Cette action est irréversible.')) return;
    try {
      await bonDeReceptionAPI.delete(bonId);
      alert('✅ Bon de Réception supprimé avec succès!');
      fetchBons();
    } catch (error) {
      alert(error.response?.data?.message || 'Échec de la suppression');
    }
  };

  const downloadBon = async (bonId) => {
    try {
      const response = await bonDeReceptionAPI.download(bonId);
      await openFile(response.data.path);
    } catch (error) {
      alert('Document non disponible');
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span
        className="status-badge"
        style={{ backgroundColor: status === 'active' ? '#C26B1E' : '#27976A' }}
      >
        {status === 'active' ? 'Actif' : 'Signé'}
      </span>
    );
  };

  const filteredBons = bons.filter(bon => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      bon.bonNumber?.toLowerCase().includes(search) ||
      bon.clientName?.toLowerCase().includes(search) ||
      bon.unite?.toLowerCase().includes(search)
    );
  });

  const activeCount = bons.filter(b => b.status === 'active').length;
  const signedCount = bons.filter(b => b.status === 'signed').length;

  if (loading) {
    return <div className="loading">Chargement des bons...</div>;
  }

  return (
    <div className="bon-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>Bons de Réception</h2>
          <p className="subtitle">{bons.length} bon(s) total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bon-stats">
        <div className="stat-item stat-total">
          <span className="stat-value">{bons.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item stat-active">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">Actifs</span>
        </div>
        <div className="stat-item stat-signed">
          <span className="stat-value">{signedCount}</span>
          <span className="stat-label">Signés</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par numéro, client, unité..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      {filteredBons.length === 0 ? (
        <div className="no-data-card">
          <p>Aucun bon de réception trouvé</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="bon-table">
            <thead>
              <tr>
                <th>N° Bon</th>
                <th>Client</th>
                <th>Unité</th>
                <th>N° Unité</th>
                <th>Tâches</th>
                <th>Statut</th>
                <th>Signé par</th>
                <th>Date signature</th>
                <th>Créé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBons.map(bon => (
                <tr key={bon._id}>
                  <td>
                    <span className="bon-number">{bon.bonNumber}</span>
                  </td>
                  <td>
                    <div className="cell-primary">{bon.clientName}</div>
                  </td>
                  <td>
                    <div className="cell-primary">{bon.unite}</div>
                  </td>
                  <td>
                    <span className="unite-number-badge">{bon.uniteNumber}</span>
                  </td>
                  <td>
                    <span className="task-count">{bon.taches?.length || 0} tâche(s)</span>
                  </td>
                  <td>{getStatusBadge(bon.status)}</td>
                  <td>
                    {bon.signedBy ? (
                      <div className="cell-primary">{bon.signedBy.name}</div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {bon.signedAt ? (
                      <div className="date-value">
                        {new Date(bon.signedAt).toLocaleDateString('fr-FR')}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="date-value">
                      {new Date(bon.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleView(bon)}
                        className="btn-action btn-view"
                        title="Voir détails"
                      >
                        ◉
                      </button>

                      {bon.status === 'active' && (isRH || isAdmin) && (
                        <button
                          onClick={() => handleSign(bon._id)}
                          className="btn-action btn-sign"
                          disabled={!bon.taches?.length}
                          title="Signer"
                        >
                          ✓
                        </button>
                      )}

                      {bon.status === 'signed' && bon.docxPath && (
                        <button
                          onClick={() => downloadBon(bon._id)}
                          className="btn-action btn-download"
                          title="Télécharger"
                        >
                          ↓
                        </button>
                      )}

                      {bon.status === 'signed' && (isRH || isAdmin) && (
                        <button
                          onClick={() => handleDelete(bon._id)}
                          className="btn-action btn-delete"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showView && (
        <BonDeReceptionView
          bon={selectedBon}
          onClose={() => {
            setShowView(false);
            setSelectedBon(null);
          }}
          onRefresh={fetchBons}
        />
      )}
    </div>
  );
}

export default BonDeReceptionList;
