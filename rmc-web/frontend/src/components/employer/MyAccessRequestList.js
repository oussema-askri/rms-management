// frontend/src/components/employer/MyAccessRequestList.js
import React, { useState, useEffect } from 'react';
import { rhAPI } from '../../services/api';
import '../rh/AccessRequestList.css';
import { openFile } from '../../services/files';


function MyAccessRequestList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await rhAPI.getMyAccessRequests();
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching my access requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = (docPath) => {
    if (!docPath) {
      alert('Document non disponible');
      return;
    }
    openFile(docPath);
  };

  const filteredRequests = requests.filter(req => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.location?.toLowerCase().includes(search) ||
      req.purpose?.toLowerCase().includes(search) ||
      req.createdBy?.name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="loading">Chargement des demandes...</div>;
  }

  return (
    <div className="access-request-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>Mes Demandes d'Accès</h2>
          <p className="subtitle">{requests.length} demande(s) approuvée(s)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="request-stats">
        <div className="stat-item stat-total">
          <span className="stat-value">{requests.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item stat-approved">
          <span className="stat-value">{requests.length}</span>
          <span className="stat-label">Approuvées</span>
        </div>
        <div className="stat-item" style={{ borderLeftColor: '#6B7280' }}>
          <span className="stat-value">{requests.filter(r => r.docxPath).length}</span>
          <span className="stat-label">Documents</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par lieu, objet, créateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <div className="no-data-card">
          <p>Aucune demande d'accès approuvée vous concernant</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="request-table">
            <thead>
              <tr>
                <th>Lieu</th>
                <th>Date Mission</th>
                <th>Durée</th>
                <th>Objet</th>
                <th>Véhicule</th>
                <th>Personnel</th>
                <th>Statut</th>
                <th>Créé par</th>
                <th>Date création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(request => (
                <tr key={request._id}>
                  <td>
                    <div className="cell-primary">{request.location}</div>
                  </td>
                  <td>
                    <div className="date-value">
                      {new Date(request.missionDate).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <span className="duration-badge">{request.duration || '—'}</span>
                  </td>
                  <td>
                    <div className="cell-truncate" title={request.purpose}>
                      {request.purpose || '—'}
                    </div>
                  </td>
                  <td>
                    {request.vehicle?.type || request.vehicle?.matricule ? (
                      <div>
                        <div className="cell-primary">{request.vehicle.type || '—'}</div>
                        {request.vehicle.matricule && (
                          <div className="cell-secondary">🚗 {request.vehicle.matricule}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {request.workers?.length > 0 ? (
                      <div className="workers-cell">
                        <span className="workers-count">{request.workers.length} ouvrier(s)</span>
                        <div className="workers-preview">
                          {request.workers.slice(0, 2).map((w, i) => (
                            <span key={i} className="worker-chip">{w.name}</span>
                          ))}
                          {request.workers.length > 2 && (
                            <span className="worker-more">+{request.workers.length - 2}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: '#27976A' }}>
                      Approuvé
                    </span>
                  </td>
                  <td>
                    <div className="cell-primary">{request.createdBy?.name || '—'}</div>
                  </td>
                  <td>
                    <div className="date-value">
                      {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {request.docxPath ? (
                        <button
                          onClick={() => downloadDocument(request.docxPath)}
                          className="btn-action btn-download"
                          title="Télécharger"
                        >
                          ↓
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyAccessRequestList;
