// frontend/src/components/rh/AccessRequestList.js
import React, { useState, useEffect, useContext } from 'react';
import { rhAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import AccessRequestForm from './AccessRequestForm';
import './AccessRequestList.css';
import { openFile } from '../../services/files';

function AccessRequestList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isRH, isAdmin, isResponsable } = useContext(AuthContext);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await rhAPI.getAccessRequests();
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approuver cette demande?')) return;
    try {
      await rhAPI.updateAccessRequestStatus(id, 'approved');
      fetchRequests();
    } catch (error) {
      alert('Échec de l\'approbation');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Rejeter cette demande?')) return;
    try {
      await rhAPI.updateAccessRequestStatus(id, 'rejected');
      fetchRequests();
    } catch (error) {
      alert('Échec du rejet');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande?')) return;
    try {
      await rhAPI.deleteAccessRequest(id);
      fetchRequests();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  const downloadDocument = (docPath) => {
    if (!docPath) {
      alert('Document non disponible');
      return;
    }
    openFile(docPath);
  };

  const getStatusBadge = (status) => {
    const colors = { pending: '#C26B1E', approved: '#27976A', rejected: '#B53535' };
    const labels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
    return (
      <span className="status-badge" style={{ backgroundColor: colors[status] }}>
        {labels[status] || status}
      </span>
    );
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  if (loading) {
    return <div className="loading">Chargement des demandes...</div>;
  }

  return (
    <div className="access-request-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>Demandes d'Accès</h2>
          <p className="subtitle">{requests.length} demande(s) total</p>
        </div>
        {(isRH || isAdmin || isResponsable) && (
          <button onClick={() => setShowForm(true)} className="btn-new">
            Nouvelle Demande
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="request-stats">
        <div className="stat-item stat-total">
          <span className="stat-value">{requests.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item stat-pending">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat-item stat-approved">
          <span className="stat-value">{approvedCount}</span>
          <span className="stat-label">Approuvées</span>
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
          <p>Aucune demande d'accès</p>
          {(isRH || isAdmin || isResponsable) && (
            <button onClick={() => setShowForm(true)} className="btn-create-first">
              Créer la Première Demande
            </button>
          )}
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
                <th>Véhicule(s)</th>
                <th>Matériels</th>
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
                    {(request.vehicles?.length > 0) ? (
                      <div className="vehicles-cell">
                        {request.vehicles.map((v, i) => (
                          <div key={i} className="vehicle-chip">
                            <span className="cell-primary">{v.type || '—'}</span>
                            {v.matricule && <span className="cell-secondary"> {v.matricule}</span>}
                          </div>
                        ))}
                      </div>
                    ) : request.vehicle?.type || request.vehicle?.matricule ? (
                      <div>
                        <div className="cell-primary">{request.vehicle.type || '—'}</div>
                        {request.vehicle.matricule && (
                          <div className="cell-secondary">{request.vehicle.matricule}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="cell-truncate" title={request.materiels}>
                      {request.materiels || '—'}
                    </div>
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
                  <td>{getStatusBadge(request.status)}</td>
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
                      {(isRH || isAdmin) && request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="btn-action btn-approve"
                            title="Approuver"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            className="btn-action btn-reject"
                            title="Rejeter"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {request.docxPath && (
                        <button
                          onClick={() => downloadDocument(request.docxPath)}
                          className="btn-action btn-download"
                          title="Télécharger"
                        >
                          ↓
                        </button>
                      )}
                      {(isRH || isAdmin) && (
                        <button
                          onClick={() => handleDelete(request._id)}
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

      {showForm && (
        <AccessRequestForm
          onClose={() => setShowForm(false)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
}

export default AccessRequestList;
