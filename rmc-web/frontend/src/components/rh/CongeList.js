// frontend/src/components/rh/CongeList.js
import React, { useState, useEffect } from 'react';
import { rhAPI } from '../../services/api';
import './CongeList.css';
import { openFile } from '../../services/files';


const statusLabel = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
const statusClass = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' };

function CongeList() {
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState({});
  const [selectedConge, setSelectedConge] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => { fetchConges(); }, []);

  const fetchConges = async () => {
    try {
      const res = await rhAPI.getAllConge();
      setConges(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await rhAPI.updateCongeStatus(id, status, comments[id] || '');
      fetchConges();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return;
    try {
      await rhAPI.deleteConge(id);
      setConges(prev => prev.filter(c => c._id !== id));
      if (selectedConge?._id === id) setSelectedConge(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const filtered = conges.filter(c => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.employeeName?.toLowerCase().includes(s) ||
      c.reason?.toLowerCase().includes(s) ||
      c.employee?.email?.toLowerCase().includes(s)
    );
  });

  const count = (status) => conges.filter(c => c.status === status).length;

  // ===== Calendar logic =====
  const getMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    return { daysInMonth, offset };
  };

  const getCongesForDay = (day) => {
    const date = new Date(calendarMonth.year, calendarMonth.month, day);
    date.setHours(0, 0, 0, 0);
    return conges.filter(c => {
      if (c.status !== 'approved') return false;
      const start = new Date(c.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(c.endDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const { daysInMonth, offset } = getMonthDays(calendarMonth.year, calendarMonth.month);

  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: m };
    });
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: m };
    });
  };

  const goToday = () => {
    const d = new Date();
    setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleDayHover = (e, day) => {
    const congesForDay = getCongesForDay(day);
    if (congesForDay.length === 0) { setHoveredDay(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: Math.min(rect.left + rect.width / 2, window.innerWidth - 180),
      y: rect.top - 8
    });
    setHoveredDay({ day, conges: congesForDay });
  };

  const handleDayClick = (day) => {
    const congesForDay = getCongesForDay(day);
    if (congesForDay.length > 0) {
      setSelectedConge(congesForDay[0]); // select first
    }
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && calendarMonth.month === today.getMonth() && calendarMonth.year === today.getFullYear();
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="conge-list">
      <div className="list-header">
        <div>
          <h2>Demandes de Congé</h2>
          <p className="subtitle">{conges.length} demande(s) au total</p>
        </div>
      </div>

      {/* Stats — full width */}
      <div className="conge-stats-full">
        <div className="conge-stat-card">
          <div className="stat-icon total">
            <span className="material-symbols-outlined">description</span>
          </div>
          <div className="stat-info">
            <div className="stat-number">{conges.length}</div>
            <div className="stat-name">Total</div>
          </div>
        </div>
        <div className="conge-stat-card">
          <div className="stat-icon pending">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div className="stat-info">
            <div className="stat-number pending">{count('pending')}</div>
            <div className="stat-name">En attente</div>
          </div>
        </div>
        <div className="conge-stat-card">
          <div className="stat-icon approved">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="stat-info">
            <div className="stat-number approved">{count('approved')}</div>
            <div className="stat-name">Approuvées</div>
          </div>
        </div>
        <div className="conge-stat-card">
          <div className="stat-icon rejected">
            <span className="material-symbols-outlined">cancel</span>
          </div>
          <div className="stat-info">
            <div className="stat-number rejected">{count('rejected')}</div>
            <div className="stat-name">Rejetées</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="conge-calendar-section">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="cal-nav-current" onClick={goToday}>{monthLabel}</button>
          <button className="cal-nav-btn" onClick={nextMonth}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div className="conge-calendar-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`blank-${i}`} className="cal-day blank"></div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayConges = getCongesForDay(day);
            const hasConge = dayConges.length > 0;
            return (
              <div
                key={day}
                className={`cal-day ${isToday(day) ? 'today' : ''} ${hasConge ? 'has-conge' : ''}`}
                onMouseEnter={(e) => handleDayHover(e, day)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => handleDayClick(day)}
              >
                <span className="cal-day-num">{day}</span>
                {hasConge && (
                  <div className="cal-day-dots">
                    {dayConges.slice(0, 3).map((c, idx) => (
                      <span key={idx} className="conge-dot" title={c.employeeName}></span>
                    ))}
                    {dayConges.length > 3 && <span className="conge-more">+{dayConges.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div className="conge-cal-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
            <div className="tooltip-date">
              {hoveredDay.day} {monthLabel}
            </div>
            {hoveredDay.conges.map((c, i) => (
              <div key={i} className="tooltip-employee">
                <span className="material-symbols-outlined" style={{fontSize: 14}}>person</span>
                {c.employeeName}
              </div>
            ))}
            <div className="tooltip-hint">Cliquer pour voir les détails</div>
          </div>
        )}
      </div>

      {/* Selected Congé Detail */}
      {selectedConge && (
        <div className="conge-detail-card">
          <div className="detail-header">
            <h3>
              <span className="material-symbols-outlined" style={{fontSize: 20, verticalAlign: 'middle', marginRight: 6}}>info</span>
              Détails du Congé
            </h3>
            <button className="detail-close" onClick={() => setSelectedConge(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Employé</span>
              <span className="detail-value">{selectedConge.employeeName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{selectedConge.employee?.email || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Du</span>
              <span className="detail-value">{new Date(selectedConge.startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Au</span>
              <span className="detail-value">{new Date(selectedConge.endDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Durée</span>
              <span className="detail-value">{Math.ceil((new Date(selectedConge.endDate) - new Date(selectedConge.startDate)) / (1000 * 60 * 60 * 24)) + 1} jour(s)</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Raison</span>
              <span className="detail-value">{selectedConge.reason}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Statut</span>
              <span className={`status-badge ${statusClass[selectedConge.status]}`}>
                {statusLabel[selectedConge.status]}
              </span>
            </div>
            {selectedConge.rhComment && (
              <div className="detail-item">
                <span className="detail-label">Commentaire RH</span>
                <span className="detail-value">{selectedConge.rhComment}</span>
              </div>
            )}
            {selectedConge.pieceJointe && (
              <div className="detail-item">
                <span className="detail-label">Pièce jointe</span>
                <button
                  type="button"
                  onClick={() => openFile(selectedConge.pieceJointe)}
                  className="piece-jointe-link"
                >
                  Voir document
                </button>
              </div>
            )}
          </div>
          <div className="detail-actions">
            {selectedConge.status !== 'approved' && (
              <button className="btn-action btn-approve" onClick={() => { handleStatus(selectedConge._id, 'approved'); setSelectedConge(null); }}>
                <span className="material-symbols-outlined" style={{fontSize: 14}}>check</span> Approuver
              </button>
            )}
            {selectedConge.status !== 'rejected' && (
              <button className="btn-action btn-reject" onClick={() => { handleStatus(selectedConge._id, 'rejected'); setSelectedConge(null); }}>
                <span className="material-symbols-outlined" style={{fontSize: 14}}>close</span> Rejeter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par employé, raison..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="no-data-card">Aucune demande de congé</div>
      ) : (
        <div className="table-container">
          <table className="conge-table">
            <thead>
              <tr>
                <th>Employé</th>
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
              {filtered.map(c => {
                const days = Math.ceil((new Date(c.endDate) - new Date(c.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                return (
                  <tr key={c._id} className={selectedConge?._id === c._id ? 'row-selected' : ''} onClick={() => setSelectedConge(c)} style={{cursor: 'pointer'}}>
                    <td>
                      <div className="cell-primary">{c.employeeName}</div>
                      <div className="cell-secondary">{c.employee?.cin || ''}</div>
                    </td>
                    <td>{new Date(c.startDate).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(c.endDate).toLocaleDateString('fr-FR')}</td>
                    <td><strong>{days}</strong></td>
                    <td style={{ maxWidth: 160 }}>{c.reason}</td>
                    <td>
                      {c.pieceJointe ? (
                        <button
                          type="button"
                          className="piece-jointe-link"
                          onClick={(e) => { e.stopPropagation(); openFile(c.pieceJointe); }}
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
                    <td>
                      <input
                        type="text"
                        placeholder="Commentaire..."
                        value={comments[c._id] || c.rhComment || ''}
                        onChange={e => setComments(prev => ({ ...prev, [c._id]: e.target.value }))}
                        className="rh-comment-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        {c.status !== 'approved' && (
                          <button className="btn-action btn-approve" onClick={() => handleStatus(c._id, 'approved')}>
                            <span className="material-symbols-outlined" style={{fontSize: 14}}>check</span>
                          </button>
                        )}
                        {c.status !== 'rejected' && (
                          <button className="btn-action btn-reject" onClick={() => handleStatus(c._id, 'rejected')}>
                            <span className="material-symbols-outlined" style={{fontSize: 14}}>close</span>
                          </button>
                        )}
                        <button className="btn-action btn-delete" onClick={() => handleDelete(c._id)}>
                          <span className="material-symbols-outlined" style={{fontSize: 14}}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CongeList;
