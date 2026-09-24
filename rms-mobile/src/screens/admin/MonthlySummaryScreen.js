import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useTabBarScroll } from '../../navigation/TabNavigator';

export default function MonthlySummaryScreen() {
  const { handleScroll } = useTabBarScroll();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const changeMonth = (dir) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setData(null);
  };

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  })();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/monthly-report?month=${month}`);
      setData(res.data.data);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de charger le rapport');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fmt = (n) => (n || 0).toFixed(2);

  const fin = data?.financial;
  const plannings = data?.planning?.items || [];
  const bons = data?.bonsDeReception?.items || [];
  const factures = data?.factures?.items || [];
  const conges = data?.conges?.items || [];
  const revenueByClient = data?.financial?.revenueByClient || [];
  const expensesByCategory = data?.financial?.expensesByCategory || [];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Generate Button */}
      {!data && !loading && (
        <View style={styles.generateWrap}>
          <TouchableOpacity style={styles.generateBtn} onPress={fetchReport}>
            <MaterialIcons name="summarize" size={20} color="#fff" />
            <Text style={styles.generateBtnText}>Générer le rapport</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.emptyText}>Chargement du rapport...</Text>
        </View>
      )}

      {data && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Financial Cards */}
          <View style={styles.finGrid}>
            <FinCard label="Revenus" value={`${fmt(fin?.totalRevenue)} TND`} color="#27976A" icon="trending-up" />
            <FinCard label="Salaires" value={`${fmt(fin?.totalSalaryCost)} TND`} color="#1E4D80" icon="payments" />
            <FinCard label="Primes" value={`${fmt(fin?.totalPrimes)} TND`} color="#785A00" icon="card-giftcard" />
            <FinCard label="Dépenses" value={`${fmt(fin?.totalExpenses)} TND`} color="#C26B1E" icon="receipt" />
            <FinCard label="Total Dépensé" value={`${fmt(fin?.totalSpent)} TND`} color="#B53535" icon="money-off" />
            <FinCard label="Résultat Net" value={`${fmt(fin?.netResult)} TND`} color={fin?.netResult >= 0 ? '#27976A' : '#B53535'} icon="account-balance" />
          </View>

          {/* Revenue by Client */}
          <CollapsibleSection
            title="Revenus par Client"
            icon="business"
            expanded={expandedSections.revenue}
            onToggle={() => toggleSection('revenue')}
          >
            {revenueByClient.length === 0 ? (
              <Text style={styles.noData}>Aucune donnée</Text>
            ) : (
              revenueByClient.map((r, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowLabel}>{r.client}</Text>
                  <Text style={styles.rowValue}>{fmt(r.total)} TND</Text>
                </View>
              ))
            )}
          </CollapsibleSection>

          {/* Expenses by Category */}
          <CollapsibleSection
            title="Dépenses par Catégorie"
            icon="category"
            expanded={expandedSections.expCat}
            onToggle={() => toggleSection('expCat')}
          >
            {expensesByCategory.length === 0 ? (
              <Text style={styles.noData}>Aucune donnée</Text>
            ) : (
              expensesByCategory.map((e, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowLabel}>{e.category || 'Autre'}</Text>
                  <Text style={styles.rowValue}>{fmt(e.total)} TND</Text>
                </View>
              ))
            )}
          </CollapsibleSection>

          {/* Salary Costs */}
          <CollapsibleSection
            title={`Coûts Salariaux (${data.employees?.length || 0})`}
            icon="badge"
            expanded={expandedSections.salary}
            onToggle={() => toggleSection('salary')}
          >
            {data.employees?.map((emp, i) => (
              <View key={i} style={styles.empRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empMeta}>
                    {emp.employeeType} - {emp.totalDays ?? (emp.daysWorked || []).length}j travaillés
                  </Text>
                </View>
                <Text style={styles.empCost}>{fmt(emp.monthlyCost)} TND</Text>
              </View>
            ))}
          </CollapsibleSection>

          {/* Planning / Tasks */}
          <CollapsibleSection
            title={`Tâches (${plannings.length})`}
            icon="task-alt"
            expanded={expandedSections.tasks}
            onToggle={() => toggleSection('tasks')}
          >
            {plannings.length === 0 ? (
              <Text style={styles.noData}>Aucune tâche</Text>
            ) : (
              plannings.slice(0, 20).map((t, i) => (
                <View key={i} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{t.clientName || 'N/A'}</Text>
                    <Text style={styles.rowMeta}>{new Date(t.date).toLocaleDateString('fr-FR')} - {t.status}</Text>
                  </View>
                </View>
              ))
            )}
            {plannings.length > 20 && (
              <Text style={styles.noData}>+{plannings.length - 20} autres...</Text>
            )}
          </CollapsibleSection>

          {/* Bons */}
          <CollapsibleSection
            title={`Bons de Réception (${bons.length})`}
            icon="verified"
            expanded={expandedSections.bons}
            onToggle={() => toggleSection('bons')}
          >
            {bons.length === 0 ? (
              <Text style={styles.noData}>Aucun bon</Text>
            ) : (
              bons.map((b, i) => (
                <View key={i} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{b.bonNumber || `Bon #${i+1}`}</Text>
                    <Text style={styles.rowMeta}>{b.clientName} - {b.status}</Text>
                  </View>
                </View>
              ))
            )}
          </CollapsibleSection>

          {/* Factures */}
          <CollapsibleSection
            title={`Factures (${factures.length})`}
            icon="receipt-long"
            expanded={expandedSections.factures}
            onToggle={() => toggleSection('factures')}
          >
            {factures.length === 0 ? (
              <Text style={styles.noData}>Aucune facture</Text>
            ) : (
              factures.map((f, i) => (
                <View key={i} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{f.factureNumber || `Facture #${i+1}`}</Text>
                    <Text style={styles.rowMeta}>{f.clientName}</Text>
                  </View>
                  <Text style={styles.rowValue}>{fmt(f.totalHT)} TND</Text>
                </View>
              ))
            )}
          </CollapsibleSection>

          {/* Congés */}
          <CollapsibleSection
            title={`Congés (${conges.length})`}
            icon="flight-takeoff"
            expanded={expandedSections.conges}
            onToggle={() => toggleSection('conges')}
          >
            {conges.length === 0 ? (
              <Text style={styles.noData}>Aucun congé</Text>
            ) : (
              conges.map((c, i) => (
                <View key={i} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{c.employeeName || 'N/A'}</Text>
                    <Text style={styles.rowMeta}>
                      {new Date(c.startDate).toLocaleDateString('fr-FR')} - {new Date(c.endDate).toLocaleDateString('fr-FR')} ({c.status})
                    </Text>
                  </View>
                </View>
              ))
            )}
          </CollapsibleSection>

          {/* Reload button */}
          <TouchableOpacity style={styles.reloadBtn} onPress={fetchReport}>
            <MaterialIcons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.reloadBtnText}>Recharger</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// Sub-components
const FinCard = ({ label, value, color, icon }) => (
  <View style={styles.finCard}>
    <MaterialIcons name={icon} size={22} color={color} />
    <Text style={styles.finLabel}>{label}</Text>
    <Text style={[styles.finValue, { color }]}>{value}</Text>
  </View>
);

const CollapsibleSection = ({ title, icon, expanded, onToggle, children }) => (
  <View style={styles.section}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <MaterialIcons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <MaterialIcons
        name={expanded ? 'expand-less' : 'expand-more'}
        size={24}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
    {expanded && <View style={styles.sectionBody}>{children}</View>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  generateWrap: {
    padding: 24,
    alignItems: 'center',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  finGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  finCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  finLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  finValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  empMeta: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  empCost: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noData: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  reloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
