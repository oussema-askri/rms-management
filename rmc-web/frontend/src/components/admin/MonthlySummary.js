import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import { exportMonthlySummary } from '../../utils/excelExport';
import './MonthlySummary.css';

function MonthlySummary() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isOpen = (key) => openSections[key] !== false; // open by default

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getMonthlyReport(month);
      setData(response.data.data);
      setOpenSections({});
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (data) exportMonthlySummary(data, month);
  };

  const fmtAmount = (val) => {
    if (val == null) return '0.00';
    return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const statusLabels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', completed: 'Terminé', in_progress: 'En cours', cancelled: 'Annulé', signed: 'Signé', active: 'Actif' };
  const typeLabels = { salarie: 'Salarié', taux_journalier: 'Journalier', prestataire: 'Prestataire' };

  const renderSectionHeader = (key, title, count) => (
    <div className="report-section-header" onClick={() => toggleSection(key)}>
      <div className="section-header-left">
        <h3>{title}</h3>
        {count !== undefined && <span className="section-badge">{count}</span>}
      </div>
      <span className={`section-toggle ${isOpen(key) ? 'open' : ''}`}>▼</span>
    </div>
  );

  return (
    <div className="monthly-summary">
      {/* Controls */}
      <div className="report-controls">
        <label>Mois :</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="month-input"
        />
        <button onClick={fetchReport} disabled={loading} className="btn-generate">
          {loading ? 'Chargement...' : 'Générer le rapport'}
        </button>
        {data && (
          <button onClick={handleExport} className="btn-export">
            Exporter en Excel
          </button>
        )}
      </div>

      {loading && (
        <div className="report-loading">Chargement du rapport...</div>
      )}

      {data && !loading && (
        <>
          {/* Financial Overview Cards */}
          <div className="financial-cards">
            <div className="fin-card revenue">
              <div className="fin-card-label">Revenu (Factures HT)</div>
              <div className="fin-card-value positive">{fmtAmount(data.financial.totalRevenue)} TND</div>
            </div>
            <div className="fin-card salary">
              <div className="fin-card-label">Coûts Salariaux</div>
              <div className="fin-card-value">{fmtAmount(data.financial.totalSalaryCost)} TND</div>
            </div>
            <div className="fin-card primes">
              <div className="fin-card-label">Primes Versées</div>
              <div className="fin-card-value">{fmtAmount(data.financial.totalPrimes)} TND</div>
            </div>
            <div className="fin-card expenses">
              <div className="fin-card-label">Dépenses Approuvées</div>
              <div className="fin-card-value">{fmtAmount(data.financial.totalExpenses)} TND</div>
            </div>
            <div className="fin-card spent">
              <div className="fin-card-label">Total Dépensé</div>
              <div className="fin-card-value">{fmtAmount(data.financial.totalSpent)} TND</div>
            </div>
            <div className={`fin-card ${data.financial.netResult >= 0 ? 'net-positive' : 'net-negative'}`}>
              <div className="fin-card-label">Résultat Net</div>
              <div className={`fin-card-value ${data.financial.netResult >= 0 ? 'positive' : 'negative'}`}>
                {data.financial.netResult >= 0 ? '+' : ''}{fmtAmount(data.financial.netResult)} TND
              </div>
            </div>
          </div>

          {/* Revenue by Client */}
          {data.financial.revenueByClient.length > 0 && (
            <div className="report-section">
              {renderSectionHeader('revenueClient', 'Revenus par Client', data.financial.revenueByClient.length)}
              {isOpen('revenueClient') && (
                <div className="report-section-body">
                  <table className="report-table">
                    <thead><tr><th>Client</th><th>Montant HT (TND)</th></tr></thead>
                    <tbody>
                      {data.financial.revenueByClient.map((r, i) => (
                        <tr key={i}>
                          <td>{r.client}</td>
                          <td><span className="amount-val green">{fmtAmount(r.total)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Expenses by Category */}
          {data.financial.expensesByCategory.length > 0 && (
            <div className="report-section">
              {renderSectionHeader('expCat', 'Dépenses par Catégorie', data.financial.expensesByCategory.length)}
              {isOpen('expCat') && (
                <div className="report-section-body">
                  <table className="report-table">
                    <thead><tr><th>Catégorie</th><th>Montant (TND)</th></tr></thead>
                    <tbody>
                      {data.financial.expensesByCategory.map((e, i) => (
                        <tr key={i}>
                          <td>{e.category}</td>
                          <td><span className="amount-val">{fmtAmount(e.total)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Salary Costs */}
          <div className="report-section">
            {renderSectionHeader('salary', 'Coûts Salariaux', data.employees.length)}
            {isOpen('salary') && (
              <div className="report-section-body">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Employé</th>
                      <th>Type</th>
                      <th>Salaire / Taux</th>
                      <th>Jours Travaillés</th>
                      <th>Coût Mensuel</th>
                      <th>Primes</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees
                      .filter(e => e.monthlyCost > 0 || e.primesTotal > 0)
                      .map(emp => (
                        <tr key={emp.userId}>
                          <td>{emp.name}</td>
                          <td>{typeLabels[emp.employeeType] || emp.employeeType}</td>
                          <td>
                            {emp.employeeType === 'taux_journalier'
                              ? `${fmtAmount(emp.dailyRate)} TND/j`
                              : `${fmtAmount(emp.salary)} TND`
                            }
                          </td>
                          <td>{emp.totalDays}</td>
                          <td><span className="amount-val">{fmtAmount(emp.monthlyCost)}</span></td>
                          <td><span className="amount-val">{fmtAmount(emp.primesTotal)}</span></td>
                          <td><span className="amount-val">{fmtAmount(emp.monthlyCost + emp.primesTotal)}</span></td>
                        </tr>
                      ))}
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--primary-200)' }}>
                      <td colSpan={4}>Total</td>
                      <td><span className="amount-val">{fmtAmount(data.financial.totalSalaryCost)}</span></td>
                      <td><span className="amount-val">{fmtAmount(data.financial.totalPrimes)}</span></td>
                      <td><span className="amount-val">{fmtAmount(data.financial.totalSalaryCost + data.financial.totalPrimes)}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="report-section">
            {renderSectionHeader('expenses', 'Dépenses', data.expenses.summary.total)}
            {isOpen('expenses') && (
              <div className="report-section-body">
                <div className="summary-chips">
                  <span className="summary-chip">Total: {data.expenses.summary.total}</span>
                  <span className="summary-chip">Approuvées: {data.expenses.summary.approved}</span>
                  <span className="summary-chip">En attente: {data.expenses.summary.pending}</span>
                  <span className="summary-chip">Rejetées: {data.expenses.summary.rejected}</span>
                  <span className="summary-chip">Montant approuvé: {fmtAmount(data.expenses.summary.approvedAmount)} TND</span>
                </div>
                {data.expenses.items.length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>Date</th><th>Description</th><th>Montant</th><th>Catégorie</th><th>Statut</th><th>Créé par</th></tr>
                    </thead>
                    <tbody>
                      {data.expenses.items.map(e => (
                        <tr key={e._id}>
                          <td>{fmtDate(e.createdAt)}</td>
                          <td>{e.description}</td>
                          <td><span className="amount-val">{fmtAmount(e.amount)} TND</span></td>
                          <td>{e.category || '—'}</td>
                          <td><span className={`report-status ${e.status}`}>{statusLabels[e.status]}</span></td>
                          <td>{e.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucune dépense ce mois</p>}
              </div>
            )}
          </div>

          {/* Planning / Tasks */}
          <div className="report-section">
            {renderSectionHeader('planning', 'Tâches / Planning', data.planning.summary.total)}
            {isOpen('planning') && (
              <div className="report-section-body">
                <div className="summary-chips">
                  <span className="summary-chip">Total: {data.planning.summary.total}</span>
                  <span className="summary-chip">Terminées: {data.planning.summary.completed}</span>
                  <span className="summary-chip">En cours: {data.planning.summary.in_progress}</span>
                  <span className="summary-chip">En attente: {data.planning.summary.pending}</span>
                  <span className="summary-chip">Annulées: {data.planning.summary.cancelled}</span>
                </div>
                {data.planning.items.length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>Date</th><th>Client</th><th>Unité</th><th>Description</th><th>Statut</th><th>Qté</th><th>Travailleurs</th></tr>
                    </thead>
                    <tbody>
                      {data.planning.items.map(p => (
                        <tr key={p._id}>
                          <td>{fmtDate(p.date)}</td>
                          <td>{p.clientName}</td>
                          <td>{p.unite}</td>
                          <td>{p.description}</td>
                          <td><span className={`report-status ${p.status}`}>{statusLabels[p.status]}</span></td>
                          <td>{p.quantite} {p.uniteQuantite}</td>
                          <td>{(p.assignedWorkers || []).join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucune tâche ce mois</p>}
              </div>
            )}
          </div>

          {/* Bons de Réception */}
          <div className="report-section">
            {renderSectionHeader('bons', 'Bons de Réception', data.bonsDeReception.summary.total)}
            {isOpen('bons') && (
              <div className="report-section-body">
                <div className="summary-chips">
                  <span className="summary-chip">Total: {data.bonsDeReception.summary.total}</span>
                  <span className="summary-chip">Signés: {data.bonsDeReception.summary.signed}</span>
                  <span className="summary-chip">Actifs: {data.bonsDeReception.summary.active}</span>
                </div>
                {data.bonsDeReception.items.length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>N° Bon</th><th>Client</th><th>Unité</th><th>Statut</th><th>Créé le</th><th>Signé le</th></tr>
                    </thead>
                    <tbody>
                      {data.bonsDeReception.items.map(b => (
                        <tr key={b._id}>
                          <td>{b.bonNumber}</td>
                          <td>{b.clientName}</td>
                          <td>{b.unite}</td>
                          <td><span className={`report-status ${b.status}`}>{statusLabels[b.status]}</span></td>
                          <td>{fmtDate(b.createdAt)}</td>
                          <td>{fmtDate(b.signedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucun bon ce mois</p>}
              </div>
            )}
          </div>

          {/* Factures */}
          <div className="report-section">
            {renderSectionHeader('factures', 'Factures', data.factures.summary.total)}
            {isOpen('factures') && (
              <div className="report-section-body">
                <div className="summary-chips">
                  <span className="summary-chip">Total: {data.factures.summary.total}</span>
                  <span className="summary-chip">Montant HT: {fmtAmount(data.factures.summary.totalHT)} TND</span>
                </div>
                {data.factures.items.length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>N° Facture</th><th>Date</th><th>Client</th><th>Total HT (TND)</th><th>Articles</th></tr>
                    </thead>
                    <tbody>
                      {data.factures.items.map(f => (
                        <tr key={f._id}>
                          <td>{f.factureNumber}</td>
                          <td>{fmtDate(f.date)}</td>
                          <td>{f.clientName}</td>
                          <td><span className="amount-val green">{fmtAmount(f.totalHT)}</span></td>
                          <td>{f.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucune facture ce mois</p>}
              </div>
            )}
          </div>

          {/* Employee Work Days */}
          <div className="report-section">
            {renderSectionHeader('workdays', 'Jours de Travail par Employé', data.employees.filter(e => e.totalDays > 0).length)}
            {isOpen('workdays') && (
              <div className="report-section-body">
                {data.employees.filter(e => e.totalDays > 0).length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>Employé</th><th>Type</th><th>Nb Jours</th><th>Dates Travaillées</th></tr>
                    </thead>
                    <tbody>
                      {data.employees
                        .filter(e => e.totalDays > 0)
                        .sort((a, b) => b.totalDays - a.totalDays)
                        .map(emp => (
                          <tr key={emp.userId}>
                            <td>{emp.name}</td>
                            <td>{typeLabels[emp.employeeType] || emp.employeeType}</td>
                            <td><strong>{emp.totalDays}</strong></td>
                            <td>
                              <div className="days-tags">
                                {emp.daysWorked.map(d => (
                                  <span key={d} className="day-tag">
                                    {new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucun jour de travail enregistré ce mois</p>}
              </div>
            )}
          </div>

          {/* Congés */}
          <div className="report-section">
            {renderSectionHeader('conges', 'Congés', data.conges.summary.total)}
            {isOpen('conges') && (
              <div className="report-section-body">
                <div className="summary-chips">
                  <span className="summary-chip">Total: {data.conges.summary.total}</span>
                  <span className="summary-chip">Approuvés: {data.conges.summary.approved}</span>
                  <span className="summary-chip">En attente: {data.conges.summary.pending}</span>
                  <span className="summary-chip">Rejetés: {data.conges.summary.rejected}</span>
                </div>
                {data.conges.items.length > 0 ? (
                  <table className="report-table">
                    <thead>
                      <tr><th>Employé</th><th>Date Début</th><th>Date Fin</th><th>Raison</th><th>Statut</th></tr>
                    </thead>
                    <tbody>
                      {data.conges.items.map(c => (
                        <tr key={c._id}>
                          <td>{c.employeeName}</td>
                          <td>{fmtDate(c.startDate)}</td>
                          <td>{fmtDate(c.endDate)}</td>
                          <td>{c.reason}</td>
                          <td><span className={`report-status ${c.status}`}>{statusLabels[c.status]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="report-empty">Aucun congé ce mois</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MonthlySummary;
