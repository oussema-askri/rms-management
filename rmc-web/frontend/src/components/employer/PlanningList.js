// frontend/src/components/employer/PlanningList.js
import React, { useState, useEffect, useContext } from 'react';
import { planningAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import PlanningForm from './PlanningForm';
import './PlanningList.css';

function PlanningList() {
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const { isAdmin, isRH, user } = useContext(AuthContext);

  useEffect(() => {
    fetchPlannings();
  }, []);

  const fetchPlannings = async () => {
    try {
      const response = await planningAPI.getAll();
      setPlannings(response.data.data);
    } catch (error) {
      console.error('Error fetching plannings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (planning) => {
    setEditData(planning);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette tâche?')) {
      return;
    }

    try {
      await planningAPI.delete(id);
      fetchPlannings();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', className: 'status-pending' },
      in_progress: { label: 'En cours', className: 'status-progress' },
      completed: { label: 'Terminé', className: 'status-completed' },
      cancelled: { label: 'Annulé', className: 'status-cancelled' }
    };
    const s = statusMap[status] || { label: status, className: '' };
    return (
      <span className={`status-pill ${s.className}`}>
        {s.label}
      </span>
    );
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' à ' + d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Chargement des tâches...</div>;
  }

  return (
    <div className="planning-list">
      <div className="list-header">
        <div>
          <h2>
            <span className="material-symbols-outlined" style={{fontSize: 24, verticalAlign: 'middle', marginRight: 8}}>task_alt</span>
            Tâches
          </h2>
          <p className="subtitle">{plannings.length} tâche(s) enregistrée(s)</p>
        </div>
        {user?.role !== 'employer' && (
          <button onClick={() => setShowForm(true)} className="btn-new">
            <span className="material-symbols-outlined" style={{fontSize: 18}}>add</span>
            Nouvelle Tâche
          </button>
        )}
      </div>

      {plannings.length === 0 ? (
        <div className="no-data-card">
          <p>Aucune tâche enregistrée</p>
          {user?.role !== 'employer' && (
            <button onClick={() => setShowForm(true)} className="btn-create-first">
              Créer la Première Tâche
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="planning-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Unité</th>
                <th>Description</th>
                <th>Matériels</th>
                <th>Quantité</th>
                <th>Date</th>
                <th>Créé par</th>
                <th>Créé le</th>
                <th>Statut</th>
                <th>Ouvriers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plannings.map(planning => (
                <tr key={planning._id}>
                  <td>
                    <div>
                      <span className="cell-primary">{planning.client?.name || planning.clientName}</span>
                      {planning.client?.clientNumber && (
                        <div className="cell-secondary">#{planning.client.clientNumber}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="cell-primary">{planning.unite}</span>
                      {planning.uniteNumber && (
                        <div className="cell-unit-number">{planning.uniteNumber}</div>
                      )}
                      {planning.sousTitre && (
                        <div className="cell-sous-titre">
                          <span className="material-symbols-outlined" style={{fontSize: 12}}>location_on</span>
                          {planning.sousTitreRef} - {planning.sousTitre}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cell-description">{planning.description}</div>
                  </td>
                  <td>
                    <div className="cell-materials">{planning.materielsNecessaires || '—'}</div>
                  </td>
                  <td>
                    <span className="cell-quantity">
                      <strong>{planning.quantite || 1}</strong> {planning.uniteQuantite || 'Heures'}
                    </span>
                  </td>
                  <td>
                    <div className="cell-date">
                      {new Date(planning.date).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    <div className="creator-badge">
                      <span className="material-symbols-outlined" style={{fontSize: 14}}>person</span>
                      {planning.createdBy?.name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="cell-datetime">
                      {formatDateTime(planning.createdAt)}
                    </div>
                  </td>
                  <td>{getStatusBadge(planning.status)}</td>
                  <td>
                    <div className="workers-info">
                      <span className="workers-count">{planning.assignedWorkers?.length || 0}</span>
                      <span className="workers-label">ouvrier(s)</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {(isAdmin || isRH) && (
                        <>
                          <button
                            onClick={() => handleEdit(planning)}
                            className="btn-action btn-edit"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(planning._id)}
                            className="btn-action btn-delete"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </>
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
        <PlanningForm
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
          onSuccess={fetchPlannings}
          editData={editData}
        />
      )}
    </div>
  );
}

export default PlanningList;