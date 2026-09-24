// frontend/src/components/employer/PlanningCalendar.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { planningAPI } from '../../services/api';
import { rhAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './PlanningCalendar.css';

function PlanningCalendar() {
  const [plannings, setPlannings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const { user, isAdmin, isRH, isResponsable } = useContext(AuthContext);

  // Filter state
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');

  const canSeeAll = isAdmin || isRH || isResponsable;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [planRes, empRes] = await Promise.all([
        planningAPI.getAll(),
        rhAPI.getEmployees()
      ]);
      setPlannings(planRes.data.data || []);
      const allEmployees = empRes.data.data || empRes.data || [];
      // Filter: only show employer and responsable roles (no rh, admin, comptable)
      const filtered = allEmployees.filter(emp =>
        emp.role === 'employer' || emp.role === 'responsable'
      );
      setEmployees(filtered);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate visible days based on view mode
  const visibleDays = useMemo(() => {
    if (selectedDate) {
      // Single date mode
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);
      return [d];
    }

    if (viewMode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month - 1, i));
      }
      return days;
    }

    // Week mode
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewMode, weekOffset, selectedMonth, selectedDate]);

  // Filter visible employees based on role + employee filter
  const visibleEmployees = useMemo(() => {
    let list = employees;

    if (!canSeeAll) {
      // Employer: only show themselves
      list = employees.filter(emp => emp._id === user?.id);
    }

    if (filterEmployee !== 'all') {
      list = list.filter(emp => emp._id === filterEmployee);
    }

    return list;
  }, [employees, canSeeAll, user, filterEmployee]);

  // Build lookup: { "employeeId-YYYY-MM-DD": [planning1, planning2, ...] }
  const cellData = useMemo(() => {
    const map = {};
    plannings.forEach(p => {
      if (!p.assignedWorkers || !p.date) return;
      const pDate = new Date(p.date).toISOString().split('T')[0];
      p.assignedWorkers.forEach(worker => {
        const workerId = typeof worker === 'object' ? worker._id : worker;
        const key = `${workerId}-${pDate}`;
        if (!map[key]) map[key] = [];
        map[key].push(p);
      });
    });
    return map;
  }, [plannings]);

  const formatDay = (d) => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNames[d.getDay()];
  };

  const formatDate = (d) => {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const isToday = (d) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const getWeekLabel = () => {
    const start = visibleDays[0];
    const end = visibleDays[visibleDays.length - 1];
    const opts = { day: 'numeric', month: 'short' };
    if (selectedDate) {
      return new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return `${start.toLocaleDateString('fr-FR', opts)} — ${end.toLocaleDateString('fr-FR', opts)} ${end.getFullYear()}`;
  };

  const getStatusClass = (status) => {
    return {
      pending: 'cell-pending',
      in_progress: 'cell-progress',
      completed: 'cell-completed',
      cancelled: 'cell-cancelled'
    }[status] || '';
  };

  const handleCellHover = (e, tasks, employee, day) => {
    if (!tasks || tasks.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: Math.min(rect.left + rect.width / 2, window.innerWidth - 200),
      y: rect.top - 8,
      tasks,
      employee,
      day
    });
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setSelectedDate('');
    setViewMode('month');
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  if (loading) {
    return <div className="loading">Chargement du planning...</div>;
  }

  return (
    <div className="planning-calendar">
      {/* Header */}
      <div className="calendar-header">
        <div>
          <h2>
            <span className="material-symbols-outlined" style={{fontSize: 24, verticalAlign: 'middle', marginRight: 8}}>calendar_month</span>
            {canSeeAll ? 'Planning Équipe' : 'Mon Planning'}
          </h2>
          <p className="subtitle">
            {canSeeAll
              ? `${visibleEmployees.length} employé(s) · ${plannings.length} tâche(s)`
              : 'Votre planning de travail'}
          </p>
        </div>

        {/* View mode + week nav */}
        <div className="calendar-controls-row">
          {viewMode === 'week' && !selectedDate && (
            <div className="week-nav">
              <button className="week-btn" onClick={() => setWeekOffset(w => w - 1)} title="Semaine précédente">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="week-current" onClick={() => setWeekOffset(0)} title="Semaine actuelle">
                {getWeekLabel()}
              </button>
              <button className="week-btn" onClick={() => setWeekOffset(w => w + 1)} title="Semaine suivante">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
          {viewMode === 'month' && !selectedDate && (
            <div className="week-current" style={{cursor: 'default'}}>
              {getWeekLabel()}
            </div>
          )}
          {selectedDate && (
            <div className="week-nav">
              <div className="week-current" style={{cursor: 'default'}}>
                {getWeekLabel()}
              </div>
              <button className="week-btn clear-btn" onClick={clearDateFilter} title="Effacer la date">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="calendar-filters">
        <div className="filter-group">
          <label className="filter-label">Vue</label>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'week' && !selectedDate ? 'active' : ''}`}
              onClick={() => { setViewMode('week'); setSelectedDate(''); }}
            >
              Semaine
            </button>
            <button
              className={`toggle-btn ${viewMode === 'month' && !selectedDate ? 'active' : ''}`}
              onClick={() => { setViewMode('month'); setSelectedDate(''); }}
            >
              Mois
            </button>
          </div>
        </div>

        {viewMode === 'month' && !selectedDate && (
          <div className="filter-group">
            <label className="filter-label">Mois</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="filter-input"
            />
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Date précise</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="filter-input"
          />
        </div>

        {canSeeAll && (
          <div className="filter-group">
            <label className="filter-label">Employé</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="filter-input"
            >
              <option value="all">Tous les employés</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot dot-pending"></span>En attente</span>
        <span className="legend-item"><span className="legend-dot dot-progress"></span>En cours</span>
        <span className="legend-item"><span className="legend-dot dot-completed"></span>Terminé</span>
        <span className="legend-item"><span className="legend-dot dot-cancelled"></span>Annulé</span>
      </div>

      {/* Calendar Grid */}
      {visibleEmployees.length === 0 ? (
        <div className="no-data-card">
          <p>Aucun employé trouvé</p>
        </div>
      ) : (
        <div className="calendar-grid-wrapper">
          <table className="calendar-grid">
            <thead>
              <tr>
                <th className="col-day">Jour</th>
                {visibleEmployees.map(emp => (
                  <th key={emp._id} className="col-employee">
                    <div className="emp-header">
                      <div className="emp-avatar">
                        {emp.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="emp-name">{emp.name}</span>
                      <span className="emp-role-tag">{emp.role === 'responsable' ? 'Resp.' : 'Emp.'}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleDays.map(day => {
                const dayStr = day.toISOString().split('T')[0];
                const isSunday = day.getDay() === 0;
                return (
                  <tr key={dayStr} className={`${isToday(day) ? 'row-today' : ''} ${isSunday ? 'row-weekend' : ''}`}>
                    <td className="col-day">
                      <div className={`day-label ${isToday(day) ? 'today' : ''}`}>
                        <span className="day-name">{formatDay(day)}</span>
                        <span className="day-date">{formatDate(day)}</span>
                      </div>
                    </td>
                    {visibleEmployees.map(emp => {
                      const key = `${emp._id}-${dayStr}`;
                      const tasks = cellData[key] || [];
                      const hasWork = tasks.length > 0;
                      const mainStatus = hasWork ? tasks[0].status : null;

                      return (
                        <td
                          key={emp._id}
                          className={`cal-cell ${hasWork ? 'has-work ' + getStatusClass(mainStatus) : ''}`}
                          onMouseEnter={(e) => handleCellHover(e, tasks, emp, day)}
                          onMouseLeave={handleCellLeave}
                        >
                          {hasWork && (
                            <div className="cell-content">
                              <span className="cell-count">{tasks.length}</span>
                              <span className="cell-label">tâche{tasks.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="calendar-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-header">
            <span className="material-symbols-outlined" style={{fontSize: 16}}>person</span>
            {tooltip.employee.name} — {tooltip.day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {tooltip.tasks.map((task, i) => (
            <div key={i} className="tooltip-task">
              <div className="tooltip-task-title">
                <span className={`tooltip-status ${getStatusClass(task.status)}`}></span>
                {task.client?.name || task.clientName} — {task.unite}
              </div>
              <div className="tooltip-task-desc">{task.description}</div>
              {task.assignedWorkers && task.assignedWorkers.length > 1 && (
                <div className="tooltip-coworkers">
                  <span className="material-symbols-outlined" style={{fontSize: 12}}>group</span>
                  Avec: {task.assignedWorkers
                    .filter(w => (typeof w === 'object' ? w._id : w) !== tooltip.employee._id)
                    .map(w => typeof w === 'object' ? w.name : 'Collègue')
                    .join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlanningCalendar;
