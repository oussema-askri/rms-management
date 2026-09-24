// frontend/src/components/employer/MyCongeList.js
import React, { useState, useEffect } from 'react';
import { rhAPI } from '../../services/api';
import '../rh/CongeList.css';
import { openFile } from '../../services/files';


const statusLabel = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
const statusClass = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' };

function MyCongeList() {
  const [conges, setConges] = useState([]);
  const [solde, setSolde] = useState(18);
  const [totalDays, setTotalDays] = useState(18);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '' });
  const [pieceJointe, setPieceJointe] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchConges(); }, []);

  const fetchConges = async () => {
    try {
      const res = await rhAPI.getMyConge();
      setConges(res.data.data);
      setSolde(res.data.solde);
      setTotalDays(res.data.totalDays);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('startDate', formData.startDate);
      fd.append('endDate', formData.endDate);
      fd.append('reason', formData.reason);
      if (pieceJointe) fd.append('pieceJointe', pieceJointe);
      await rhAPI.createConge(fd);
      setShowForm(false);
      setFormData({ startDate: '', endDate: '', reason: '' });
      setPieceJointe(null);
      fetchConges();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return;
    try {
      await rhAPI.deleteConge(id);
      setConges(prev => prev.filter(c => c._id !== id));
      fetchConges();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  const soldePct = Math.round((solde / totalDays) * 100);

  return (
    <div className="conge-list">
      <div className="list-header">
        <div>
          <h2>Mes Demandes de Congé</h2>
          <p className="subtitle">{conges.length} demande(s)</p>
        </div>
        <button className="btn-new" onClick={() => setShowForm(true)}>
          + Nouvelle Demande
        </button>
      </div>

      {/* Solde Banner Gradient (Matching Mon Espace) */}
      <div style={{ background: 'linear-gradient(135deg, #163C66, #1e4f87)', borderRadius: 12, padding: '24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 30, color: 'white', boxShadow: '0 4px 15px rgba(22, 60, 102, 0.15)' }}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Solde de congé restant</div>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>{solde} <span style={{ fontSize: 16, fontWeight: 400 }}>jours</span></div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>sur {totalDays} jours annuels</div>
        </div>
        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${soldePct}%`, background: '#4ADE80', borderRadius: 99, transition: 'width 1s ease-in-out' }} />
        </div>
      </div>

      {conges.length === 0 ? (
        <div className="no-data-card">Aucune demande de congé</div>
      ) : (
        <div className="table-container">
          <table className="conge-table">
            <thead>
              <tr>
                <th>Du</th>
                <th>Au</th>
                <th>Jours</th>
                <th>Raison</th>
                <th>Pièce jointe</th>
                <th>Statut</th>
                <th>Commentaire RH</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conges.map(c => {
                const days = Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                return (
                  <tr key={c._id}>
                    <td>{new Date(c.startDate).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(c.endDate).toLocaleDateString('fr-FR')}</td>
                    <td><strong>{days}</strong></td>
                    <td style={{ maxWidth: 180 }}>{c.reason}</td>
                    <td>
                      {c.pieceJointe ? (
                        <button
                          type="button"
                          onClick={() => openFile(c.pieceJointe)}
                          className="piece-jointe-link"
                        >
                          Voir document
                        </button>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                    <td>{c.rhComment || <span className="text-muted">—</span>}</td>
                    <td>
                      {c.status === 'pending' && (
                        <button className="btn-action btn-delete" onClick={() => handleDelete(c._id)}>
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Conge Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nouvelle Demande de Congé</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
            </div>

            <form className="conge-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label>Date de début *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date de fin *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Raison *</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Motif de la demande de congé..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Pièce jointe (optionnel)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setPieceJointe(e.target.files[0])}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Envoi...' : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCongeList;
