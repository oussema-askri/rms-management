// frontend/src/components/rh/EmployeeList.js
import React, { useState, useEffect, useContext } from 'react';
import { rhAPI, adminAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import EmployeeForm from './EmployeeForm';
import './EmployeeList.css';
import { openFile } from '../../services/files';
import AuthImage from '../shared/AuthImage';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [soldes, setSoldes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isRH, isComptable, isResponsable, canManageEmployees } = useContext(AuthContext);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // GET /rh/conge/soldes is restricted to rh, admin and comptable. Requesting it
  // as a responsable returned 403, which rejected the whole Promise.all and left
  // every balance showing a hardcoded 18.
  const canSeeSoldes = isRH || isAdmin || isComptable;

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const empRes = await rhAPI.getEmployees();
      setEmployees(empRes.data.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }

    if (canSeeSoldes) {
      try {
        const soldeRes = await rhAPI.getAllSoldes();
        setSoldes(soldeRes.data.soldes || {});
      } catch (error) {
        console.error('Error fetching conge balances:', error);
      }
    }

    setLoading(false);
  };

  const handleEdit = (employee) => {
    setEditData(employee);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employé?')) return;
    try {
      await rhAPI.deleteEmployee(id);
      fetchEmployees();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  const handleResetPassword = async (emp) => {
    // The server now generates a random password per reset instead of setting
    // every account to the same known value, and returns it exactly once.
    if (!window.confirm(
      `Réinitialiser le mot de passe de ${emp.name} ?

` +
      'Un mot de passe temporaire sera généré et affiché une seule fois.'
    )) return;
    try {
      const response = await adminAPI.resetUserPassword(emp._id);
      const temporary = response.data.temporaryPassword;
      alert(
        `${response.data.message}

` +
        `Mot de passe temporaire : ${temporary}

` +
        'Notez-le maintenant, il ne sera plus affiché.'
      );
    } catch (error) {
      alert('Échec de la réinitialisation');
    }
  };

  const toggleAvailability = async (id, currentStatus) => {
    try {
      await rhAPI.setAvailability(id, { isAvailable: !currentStatus });
      fetchEmployees();
    } catch (error) {
      alert('Échec de la mise à jour');
    }
  };

  const viewDocument = (path) => openFile(path);

  const canSeeFinancials = isAdmin || isRH || isComptable;
  const canSeeRoleType = canManageEmployees;

  const getRoleBadge = (role) => {
    const colors = { employer: '#2D5F9A', rh: '#27976A', admin: '#B53535', responsable: '#7C3AED', comptable: '#D97706' };
    const labels = { employer: 'Employé', rh: 'RH', admin: 'Admin', responsable: 'Responsable', comptable: 'Comptable' };
    return (
      <span style={{
        display: 'inline-block',
        backgroundColor: colors[role] || '#6b7280',
        color: '#ffffff',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
      }}>
        {labels[role] || role}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const colors = { salarie: '#0891B2', taux_journalier: '#059669', prestataire: '#7C3AED' };
    const labels = { salarie: 'Salarié', taux_journalier: 'Journalier', prestataire: 'Prestataire' };
    const t = type || 'salarie';
    return (
      <span style={{
        display: 'inline-block',
        backgroundColor: colors[t] || '#6b7280',
        color: '#ffffff',
        fontSize: '0.65rem',
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
      }}>
        {labels[t] || t}
      </span>
    );
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    const search = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.cin?.toLowerCase().includes(search) ||
      emp.phone?.toLowerCase().includes(search)
    );
  });

  const availableCount = employees.filter(e => e.isAvailable).length;
  const unavailableCount = employees.filter(e => !e.isAvailable).length;

  if (loading) {
    return <div className="loading">Chargement des employés...</div>;
  }

  return (
    <div className="employee-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>Gestion des Employés</h2>
          <p className="subtitle">{employees.length} employé(s) total</p>
        </div>
        {(isRH || isAdmin) && (
          <button onClick={() => setShowForm(true)} className="btn-new">
            Ajouter Employé
          </button>
        )}

      </div>

      {/* Stats */}
      <div className="employee-stats">
        <div className="stat-item stat-total">
          <span className="stat-value">{employees.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item stat-available">
          <span className="stat-value">{availableCount}</span>
          <span className="stat-label">Disponibles</span>
        </div>
        <div className="stat-item stat-unavailable">
          <span className="stat-value">{unavailableCount}</span>
          <span className="stat-label">Indisponibles</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par nom, email, CIN, téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      {filteredEmployees.length === 0 ? (
        <div className="no-data-card">
          <p>Aucun employé trouvé</p>
          {(isRH || isAdmin) && (
              <button onClick={() => setShowForm(true)} className="btn-create-first">
                Ajouter le Premier Employé
              </button>
            )}
        </div>
      ) : (
        <div className="table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employé</th>
                {canSeeRoleType && <th>Rôle / Type</th>}
                <th>CIN / CNSS</th>
                <th>Email</th>
                <th>Téléphone</th>
                {canSeeFinancials && <th>Salaire / Taux</th>}
                <th>État Civil</th>
                <th>Disponibilité</th>
                <th>Solde Congé</th>
                <th>Documents</th>
                {canManageEmployees && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {/* AuthImage renders nothing until the protected file
                            loads, so the initial placeholder stays visible and
                            is simply covered once the photo arrives. */}
                        {emp.photo ? <AuthImage path={emp.photo} alt={emp.name} /> : null}
                        <div className="avatar-placeholder">
                          {emp.name?.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="cell-primary">{emp.name}</div>
                    </div>
                  </td>
                  {canSeeRoleType && (
                    <td>
                      <div className="badge-stack">
                        {getRoleBadge(emp.role)}
                        {getTypeBadge(emp.employeeType)}
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="id-stack">
                      <span className="mono-text">{emp.cin || '—'}</span>
                      <span className="mono-text id-secondary">{emp.cnss || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="cell-email">{emp.email || '—'}</span>
                  </td>
                  <td>{emp.phone || '—'}</td>
                  {canSeeFinancials && (
                    <td>
                      {emp.employeeType === 'taux_journalier' ? (
                        <span className="salary-value">{emp.dailyRate ? `${emp.dailyRate} TND/j` : '—'}</span>
                      ) : (
                        <span className="salary-value">{emp.salary ? `${emp.salary} TND` : '—'}</span>
                      )}
                    </td>
                  )}
                  <td>
                    <span className="civil-status">{emp.etatSocial || '—'}</span>
                  </td>
                  <td>
                    {(isRH || isAdmin || isResponsable) ? (
                      <button
                        onClick={() => toggleAvailability(emp._id, emp.isAvailable)}
                        className={`availability-toggle ${emp.isAvailable ? 'available' : 'unavailable'}`}
                      >
                        {emp.isAvailable ? 'Disponible' : 'Indisponible'}
                      </button>
                    ) : (
                      <span className={`availability-badge ${emp.isAvailable ? 'available' : 'unavailable'}`}>
                        {emp.isAvailable ? 'Disponible' : 'Indisponible'}
                      </span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const s = soldes[emp._id];
                      // Do not invent a balance the server did not send.
                      if (s === undefined) {
                        return <span style={{ color: 'var(--on-surface-variant, #6B7280)' }}>—</span>;
                      }
                      const pct = Math.round((s / 18) * 100);
                      const color = s > 9 ? '#10B981' : s > 4 ? '#F59E0B' : '#EF4444';
                      return (
                        <div style={{ minWidth: 60 }}>
                          <span style={{ fontWeight: 700, color, fontSize: '0.8rem' }}>{s} / 18</span>
                          <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {emp.cinImage && (
                        <button
                          onClick={() => viewDocument(emp.cinImage)}
                          className="btn-action btn-doc"
                          title="Voir CIN"
                        >
                          ID
                        </button>
                      )}
                    </div>
                  </td>
                  {canManageEmployees && (
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="btn-action btn-edit"
                          title="Modifier"
                        >
                          ✎
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleResetPassword(emp)}
                            className="btn-action btn-reset"
                            title="Réinitialiser mot de passe"
                          >
                            🔑
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(emp._id)}
                            className="btn-action btn-delete"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
          onSuccess={fetchEmployees}
          editData={editData}
        />
      )}
    </div>
  );
}

export default EmployeeList;
