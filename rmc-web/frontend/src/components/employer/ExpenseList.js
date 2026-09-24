// frontend/src/components/employer/ExpenseList.js
import React, { useState, useEffect, useContext } from 'react';
import { expenseAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ExpenseForm from './ExpenseForm';
import './ExpenseList.css';
import { openFile } from '../../services/files';

function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const { isAdmin, isRH } = useContext(AuthContext);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await expenseAPI.getAll();
      setExpenses(response.data.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approuver cette dépense?')) return;
    try {
      await expenseAPI.updateStatus(id, 'approved');
      fetchExpenses();
    } catch (error) {
      alert('Échec de l\'approbation');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Rejeter cette dépense?')) return;
    try {
      await expenseAPI.updateStatus(id, 'rejected');
      fetchExpenses();
    } catch (error) {
      alert('Échec du rejet');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette dépense?')) return;
    try {
      await expenseAPI.delete(id);
      fetchExpenses();
    } catch (error) {
      alert('Échec de la suppression');
    }
  };

  const viewFacture = (facturePath) => openFile(facturePath);

  const getStatusBadge = (status) => {
    const colors = {
      pending: '#C26B1E',
      approved: '#27976A',
      rejected: '#B53535'
    };
    const labels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
    return (
      <span className="status-badge" style={{ backgroundColor: colors[status] }}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    return method === 'espece' ? 'Espèce' : 'Virement';
  };

  const filterByDate = (expense) => {
    const expenseDate = new Date(expense.createdAt);
    const today = new Date();
    switch (dateFilter) {
      case 'today':
        return expenseDate.toDateString() === today.toDateString();
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return expenseDate.toDateString() === yesterday.toDateString();
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return expenseDate >= weekStart;
      case 'thisMonth':
        return expenseDate.getMonth() === today.getMonth() && expenseDate.getFullYear() === today.getFullYear();
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return expenseDate >= lastMonth && expenseDate <= lastMonthEnd;
      case 'thisYear':
        return expenseDate.getFullYear() === today.getFullYear();
      case 'custom':
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return expenseDate >= start && expenseDate <= end;
      default:
        return true;
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const statusMatch = filter === 'all' || expense.status === filter;
    const dateMatch = filterByDate(expense);
    return statusMatch && dateMatch;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'rejected').length;

  if (loading) {
    return <div className="loading">Chargement des dépenses...</div>;
  }

  return (
    <div className="expense-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>Gestion des Dépenses</h2>
          <p className="subtitle">{expenses.length} dépense(s) au total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-new">
          Nouvelle Dépense
        </button>
      </div>

      {/* Summary Stats */}
      <div className="expense-stats">
        <div className="stat-item stat-total">
          <span className="stat-value">{totalAmount.toFixed(2)} TND</span>
          <span className="stat-label">Total affiché</span>
        </div>
        <div className="stat-item stat-pending">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat-item stat-approved">
          <span className="stat-value">{approvedCount}</span>
          <span className="stat-label">Approuvées</span>
        </div>
        <div className="stat-item stat-rejected">
          <span className="stat-value">{rejectedCount}</span>
          <span className="stat-label">Rejetées</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="status-filters">
          {[
            { key: 'all', label: `Tous (${expenses.length})` },
            { key: 'pending', label: `En attente (${pendingCount})` },
            { key: 'approved', label: `Approuvés (${approvedCount})` },
            { key: 'rejected', label: `Rejetés (${rejectedCount})` },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="date-filter-group">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-select"
          >
            <option value="all">📅 Toutes les périodes</option>
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="thisWeek">Cette semaine</option>
            <option value="thisMonth">Ce mois</option>
            <option value="lastMonth">Mois dernier</option>
            <option value="thisYear">Cette année</option>
            <option value="custom">Période personnalisée</option>
          </select>

          {dateFilter === 'custom' && (
            <div className="custom-date-range">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="date-input" />
              <span className="date-separator">→</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="date-input" />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <div className="no-data-card">
          <p>Aucune dépense trouvée</p>
          <button onClick={() => setShowForm(true)} className="btn-create-first">
            Créer la Première Dépense
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Catégorie</th>
                <th>Créé par</th>
                <th>Date</th>
                <th>Approuvé par</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense._id}>
                  <td>
                    <div className="cell-primary">{expense.description}</div>
                    {expense.notes && <div className="cell-secondary">{expense.notes}</div>}
                  </td>
                  <td>
                    <span className="amount-value">{expense.amount.toFixed(2)} TND</span>
                  </td>
                  <td>{getPaymentMethodLabel(expense.paymentMethod)}</td>
                  <td>
                    {expense.category ? (
                      <span className="category-badge">{expense.category}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="cell-primary">{expense.createdBy?.name || '—'}</div>
                  </td>
                  <td>
                    <div className="date-value">
                      {new Date(expense.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td>
                    {expense.approvedBy ? (
                      <div className="cell-primary">{expense.approvedBy.name}</div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{getStatusBadge(expense.status)}</td>
                  <td>
                    <div className="action-buttons">
                      {expense.factureImage && (
                        <button
                          onClick={() => viewFacture(expense.factureImage)}
                          className="btn-action btn-view"
                          title="Voir la facture"
                        >
                          ◉
                        </button>
                      )}

                      {(isAdmin || isRH) && expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense._id)}
                            className="btn-action btn-approve"
                            title="Approuver"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(expense._id)}
                            className="btn-action btn-reject"
                            title="Rejeter"
                          >
                            ✕
                          </button>
                        </>
                      )}

                      {(isAdmin || isRH) && (
                        <button
                          onClick={() => handleDelete(expense._id)}
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
        <ExpenseForm
          onClose={() => setShowForm(false)}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  );
}

export default ExpenseList;
