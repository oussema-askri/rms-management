import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  adminAPI, rhAPI, expenseAPI, planningAPI, bonDeReceptionAPI, facturationAPI, pointageAPI,
} from '../../services/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import './DashboardOverview.css';

// The "Tableau de bord" of every role: four figures, then the quick links.
//
// Only the administrator used to get figures (six of them, which wrapped to
// five on one line and one alone on the next), and every role's quick links
// wrapped the same way. Each role now gets exactly four figures, which always
// share one line on a computer, and the links use a column count that never
// leaves one card alone on a row.

const list = (response) => response?.data?.data || [];
const count = (items, predicate) => items.filter(predicate).length;
const money = (n) => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND`;
const isPending = (item) => item.status === 'pending';

// Today in the server's YYYY-MM-DD form, local calendar day.
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Each loader returns the four cards. A request that fails shows "—" on its
// own card rather than blanking the whole row.
const settled = async (requests) => (await Promise.allSettled(requests))
  .map((r) => (r.status === 'fulfilled' ? r.value : null));

const LOADERS = {
  admin: async () => {
    const [stats] = await settled([adminAPI.getStats()]);
    const s = stats?.data?.data;
    return [
      { icon: 'group', label: 'Utilisateurs', value: s?.totalUsers, tab: 'employees' },
      { icon: 'task_alt', label: 'Tâches planifiées', value: s?.totalPlanning, tab: 'taches' },
      { icon: 'hourglass_top', label: 'Dépenses en attente', value: s?.pendingExpenses, tab: 'expenses', tone: 'warning' },
      { icon: 'payments', label: 'Dépenses approuvées', value: s ? money(s.totalExpenseAmount) : undefined, tab: 'expenses', tone: 'success' },
    ];
  },

  rh: async () => {
    const [employees, conges, access, expenses] = await settled([
      rhAPI.getEmployees(), rhAPI.getAllConge(), rhAPI.getAccessRequests(), expenseAPI.getAll(),
    ]);
    return [
      { icon: 'badge', label: 'Employés', value: employees && list(employees).length, tab: 'employees' },
      { icon: 'beach_access', label: 'Congés en attente', value: conges && count(list(conges), isPending), tab: 'conge', tone: 'warning' },
      { icon: 'key', label: "Demandes d'accès en attente", value: access && count(list(access), isPending), tab: 'access', tone: 'warning' },
      { icon: 'hourglass_top', label: 'Dépenses en attente', value: expenses && count(list(expenses), isPending), tab: 'expenses', tone: 'warning' },
    ];
  },

  comptable: async () => {
    const [bons, factures, expenses] = await settled([
      bonDeReceptionAPI.getAll(), facturationAPI.getAll(), expenseAPI.getAll(),
    ]);
    const factureList = factures && list(factures);
    const approved = expenses && list(expenses).filter((e) => e.status === 'approved');
    return [
      // Signed and not yet on an invoice: the work waiting to be billed.
      { icon: 'pending_actions', label: 'Bons à facturer', value: bons && count(list(bons), (b) => b.status === 'signed' && !b.facture), tab: 'facturation', tone: 'warning' },
      { icon: 'description', label: 'Factures émises', value: factureList?.length, tab: 'facturation' },
      { icon: 'account_balance', label: 'Total facturé (HT)', value: factureList && money(factureList.reduce((sum, f) => sum + (f.totalHT || 0), 0)), tab: 'facturation', tone: 'success' },
      { icon: 'payments', label: 'Dépenses approuvées', value: approved && money(approved.reduce((sum, e) => sum + (e.amount || 0), 0)), tab: 'expenses' },
    ];
  },

  responsable: async () => {
    const [plannings, pointage, access, expenses] = await settled([
      planningAPI.getAll(), pointageAPI.getMy(todayISO()), rhAPI.getAccessRequests(), expenseAPI.getAll(),
    ]);
    const done = pointage && !!pointage.data?.data;
    return [
      { icon: 'task_alt', label: 'Tâches à réaliser', value: plannings && count(list(plannings), (p) => ['pending', 'in_progress'].includes(p.status)), tab: 'taches' },
      { icon: done ? 'event_available' : 'event_busy', label: 'Pointage du jour', value: pointage ? (done ? 'Fait' : 'À faire') : undefined, tab: 'pointage', tone: done ? 'success' : 'warning' },
      { icon: 'key', label: "Demandes d'accès en attente", value: access && count(list(access), isPending), tab: 'access', tone: 'warning' },
      // The server returns only a responsable's own expenses.
      { icon: 'receipt_long', label: 'Mes dépenses en attente', value: expenses && count(list(expenses), isPending), tab: 'expenses' },
    ];
  },

  employer: async (user) => {
    const myId = String(user?._id || user?.id || '');
    const [plannings, expenses, permits, conges] = await settled([
      planningAPI.getAll(), expenseAPI.getAll(), rhAPI.getMyAccessRequests(), rhAPI.getMyConge(),
    ]);
    const mine = (p) => (p.assignedWorkers || []).some((w) => String(w?._id || w) === myId);
    return [
      { icon: 'task_alt', label: 'Mes tâches à réaliser', value: plannings && count(list(plannings), (p) => mine(p) && ['pending', 'in_progress'].includes(p.status)), tab: 'planning' },
      { icon: 'receipt_long', label: 'Mes dépenses en attente', value: expenses && count(list(expenses), isPending), tab: 'expenses' },
      { icon: 'verified', label: "Mes autorisations d'accès", value: permits && list(permits).length, tab: 'my-access', tone: 'success' },
      { icon: 'beach_access', label: 'Mes congés en attente', value: conges && count(list(conges), isPending), tab: 'conge', tone: 'warning' },
    ];
  },
};

const QUICK_LINKS = {
  admin: [
    { icon: 'groups', title: 'Clients', text: 'Gérer les clients et unités', tab: 'clients' },
    { icon: 'calendar_month', title: 'Planning', text: 'Voir toutes les tâches', tab: 'planning' },
    { icon: 'inventory', title: 'Bons de Réception', text: 'Signer les bons', tab: 'bon-reception' },
    { icon: 'receipt_long', title: 'Dépenses', text: 'Approuver les dépenses', tab: 'expenses' },
    { icon: 'badge', title: 'Employés', text: 'Gérer les employés', tab: 'employees' },
    { icon: 'key', title: "Demandes d'Accès", text: 'Gérer les accès', tab: 'access' },
  ],
  rh: [
    { icon: 'groups', title: 'Clients', text: 'Gérer les clients et unités', tab: 'clients' },
    { icon: 'calendar_month', title: 'Planning', text: 'Voir toutes les tâches', tab: 'planning' },
    { icon: 'inventory', title: 'Bons de Réception', text: 'Signer les bons', tab: 'bon-reception' },
    { icon: 'receipt_long', title: 'Dépenses', text: 'Approuver les dépenses', tab: 'expenses' },
    { icon: 'badge', title: 'Employés', text: 'Gérer les employés', tab: 'employees' },
    { icon: 'key', title: "Demandes d'Accès", text: 'Gérer les accès', tab: 'access' },
  ],
  comptable: [
    { icon: 'receipt_long', title: 'Dépenses', text: 'Consulter toutes les dépenses', tab: 'expenses' },
    { icon: 'inventory', title: 'Bons de Réception', text: 'Consulter les bons', tab: 'bon-reception' },
    { icon: 'description', title: 'Facturation', text: 'Consulter et télécharger les factures', tab: 'facturation' },
    { icon: 'badge', title: 'Employés & Salaires', text: 'Consulter les salaires', tab: 'employees' },
  ],
  responsable: [
    { icon: 'groups', title: 'Clients', text: 'Gérer les clients et unités', tab: 'clients' },
    { icon: 'calendar_month', title: 'Planning', text: 'Voir toutes les tâches', tab: 'planning' },
    { icon: 'inventory', title: 'Bons de Réception', text: 'Consulter les bons', tab: 'bon-reception' },
    { icon: 'receipt_long', title: 'Mes Dépenses', text: 'Soumettre et suivre', tab: 'expenses' },
    { icon: 'badge', title: 'Employés', text: 'Gérer les employés', tab: 'employees' },
    { icon: 'key', title: "Demandes d'Accès", text: 'Gérer les accès', tab: 'access' },
  ],
  employer: [
    { icon: 'groups', title: 'Clients', text: 'Voir les clients', tab: 'clients' },
    { icon: 'calendar_month', title: 'Mon Planning', text: 'Voir mes tâches', tab: 'planning' },
    { icon: 'receipt_long', title: 'Mes Dépenses', text: 'Soumettre une dépense', tab: 'expenses' },
    { icon: 'verified', title: 'Mes Accès', text: 'Missions approuvées', tab: 'my-access' },
    { icon: 'beach_access', title: 'Mes Congés', text: 'Demander un congé', tab: 'conge' },
  ],
};

// Columns for a set of cards on a wide screen and on a medium one, chosen so
// no card is left alone on a row: 6 -> 3+3 on both, 5 -> one row then 3+2,
// 4 -> one row then 2+2. Phones always get a single column (see the CSS).
const columnsFor = (n) => ({
  wide: n <= 5 ? n : (n % 3 === 0 ? 3 : 4),
  medium: n % 2 === 0 && n % 3 !== 0 ? 2 : 3,
});

const go = (tab) => { window.location.hash = tab; };

function DashboardOverview({ role }) {
  const { user } = useContext(AuthContext);
  const [kpis, setKpis] = useState(null);

  const load = useCallback(async () => {
    const loader = LOADERS[role];
    if (!loader) return;
    setKpis(await loader(user));
  }, [role, user]);

  useEffect(() => { load(); }, [load]);
  // The figures are counts of things waiting on someone, so keep them current
  // like the lists they summarise.
  useAutoRefresh(load);

  const links = QUICK_LINKS[role] || [];
  const linkCols = columnsFor(links.length);
  // While loading, four placeholder cards keep the layout from jumping.
  const cards = kpis || Array.from({ length: 4 }, (_, i) => ({ placeholder: true, label: '', icon: '', tab: '', key: i }));

  return (
    <div className="dash-overview">
      <div className="dash-kpis">
        {cards.map((kpi, i) => (
          <button
            key={kpi.label || i}
            type="button"
            className={`dash-kpi dash-kpi--${kpi.tone || 'primary'}${kpi.placeholder ? ' is-loading' : ''}`}
            onClick={() => kpi.tab && go(kpi.tab)}
            disabled={kpi.placeholder}
          >
            <span className="dash-kpi-icon material-symbols-outlined" aria-hidden="true">{kpi.icon}</span>
            <span className="dash-kpi-text">
              <span className="dash-kpi-value">
                {kpi.placeholder ? ' ' : (kpi.value === undefined || kpi.value === null || kpi.value === false ? '—' : kpi.value)}
              </span>
              <span className="dash-kpi-label">{kpi.label || ' '}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="dash-links-section">
        <h2 className="dash-section-title">Accès Rapide</h2>
        <div
          className="dash-links"
          style={{ '--cols': linkCols.wide, '--cols-md': linkCols.medium }}
        >
          {links.map((link) => (
            <button key={link.tab} type="button" className="dash-link" onClick={() => go(link.tab)}>
              <span className="dash-link-icon material-symbols-outlined" aria-hidden="true">{link.icon}</span>
              <span className="dash-link-text">
                <span className="dash-link-title">{link.title}</span>
                <span className="dash-link-sub">{link.text}</span>
              </span>
              <span className="dash-link-arrow material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DashboardOverview;
