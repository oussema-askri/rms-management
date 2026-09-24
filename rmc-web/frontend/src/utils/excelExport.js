export async function exportMonthlySummary(data, month) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const monthLabel = month;

  // --- Sheet 1: Resume Financier ---
  const financialRows = [
    ['Rapport Mensuel', monthLabel],
    [],
    ['Indicateur', 'Montant (TND)'],
    ['Revenu Total (HT)', data.financial.totalRevenue],
    ['Coût Salarial Total', data.financial.totalSalaryCost],
    ['Primes Versées', data.financial.totalPrimes],
    ['Dépenses Approuvées', data.financial.totalExpenses],
    ['Total Dépensé', data.financial.totalSpent],
    ['Résultat Net', data.financial.netResult],
    [],
    ['Revenus par Client'],
    ['Client', 'Montant (TND)'],
    ...data.financial.revenueByClient.map(r => [r.client, r.total]),
    [],
    ['Dépenses par Catégorie'],
    ['Catégorie', 'Montant (TND)'],
    ...data.financial.expensesByCategory.map(e => [e.category, e.total]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(financialRows), 'Resume Financier');

  // --- Sheet 2: Employés ---
  const empHeaders = ['Nom', 'Rôle', 'Type', 'Salaire Mensuel', 'Taux Journalier', 'Jours Travaillés', 'Coût Mensuel', 'Primes'];
  const empRows = data.employees.map(e => [
    e.name,
    e.role,
    e.employeeType === 'salarie' ? 'Salarié' : e.employeeType === 'taux_journalier' ? 'Journalier' : 'Prestataire',
    e.salary,
    e.dailyRate,
    e.totalDays,
    e.monthlyCost,
    e.primesTotal,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([empHeaders, ...empRows]), 'Employes');

  // --- Sheet 3: Dépenses ---
  const expHeaders = ['Date', 'Description', 'Montant (TND)', 'Catégorie', 'Statut', 'Créé par'];
  const statusLabels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
  const expRows = data.expenses.items.map(e => [
    new Date(e.createdAt).toLocaleDateString('fr-FR'),
    e.description,
    e.amount,
    e.category || '',
    statusLabels[e.status] || e.status,
    e.createdBy,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]), 'Depenses');

  // --- Sheet 4: Planning ---
  const planHeaders = ['Date', 'Client', 'Unité', 'Description', 'Statut', 'Quantité', 'Unité Qté', 'Travailleurs'];
  const planStatusLabels = { pending: 'En attente', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' };
  const planRows = data.planning.items.map(p => [
    new Date(p.date).toLocaleDateString('fr-FR'),
    p.clientName,
    p.unite,
    p.description,
    planStatusLabels[p.status] || p.status,
    p.quantite,
    p.uniteQuantite,
    (p.assignedWorkers || []).join(', '),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([planHeaders, ...planRows]), 'Planning');

  // --- Sheet 5: Bons de Réception ---
  const bonHeaders = ['N° Bon', 'Client', 'Unité', 'Statut', 'Date Création', 'Date Signature'];
  const bonRows = data.bonsDeReception.items.map(b => [
    b.bonNumber,
    b.clientName,
    b.unite,
    b.status === 'signed' ? 'Signé' : 'Actif',
    new Date(b.createdAt).toLocaleDateString('fr-FR'),
    b.signedAt ? new Date(b.signedAt).toLocaleDateString('fr-FR') : '',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bonHeaders, ...bonRows]), 'Bons de Reception');

  // --- Sheet 6: Factures ---
  const factHeaders = ['N° Facture', 'Date', 'Client', 'Total HT (TND)', 'Nb Articles'];
  const factRows = data.factures.items.map(f => [
    f.factureNumber,
    new Date(f.date).toLocaleDateString('fr-FR'),
    f.clientName,
    f.totalHT,
    f.itemCount,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([factHeaders, ...factRows]), 'Factures');

  // --- Sheet 7: Jours de Travail ---
  // Employee x date matrix
  const allDates = new Set();
  data.employees.forEach(e => e.daysWorked.forEach(d => allDates.add(d)));
  const sortedDates = Array.from(allDates).sort();

  if (sortedDates.length > 0) {
    const jtHeaders = ['Employé', ...sortedDates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR'))];
    const jtRows = data.employees
      .filter(e => e.totalDays > 0)
      .map(e => {
        const daysSet = new Set(e.daysWorked);
        return [e.name, ...sortedDates.map(d => daysSet.has(d) ? 'X' : '')];
      });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([jtHeaders, ...jtRows]), 'Jours Travail');
  }

  // --- Sheet 8: Congés ---
  const congeHeaders = ['Employé', 'Date Début', 'Date Fin', 'Raison', 'Statut'];
  const congeRows = data.conges.items.map(c => [
    c.employeeName,
    new Date(c.startDate).toLocaleDateString('fr-FR'),
    new Date(c.endDate).toLocaleDateString('fr-FR'),
    c.reason,
    statusLabels[c.status] || c.status,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([congeHeaders, ...congeRows]), 'Conges');

  // --- Download ---
  XLSX.writeFile(wb, `rapport_mensuel_${month}.xlsx`);
}
