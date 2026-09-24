import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/config';
import { useTabBarScroll } from '../../navigation/TabNavigator';

const ALL_MODULES = [
  {
    key: 'ClientList',
    icon: 'group',
    label: 'Clients',
    subtitle: 'Gérer clients & unités',
    color: '#1E4D80',
    roles: 'all',
  },
  {
    key: 'PlanningList',
    icon: 'task',
    label: 'Tâches',
    subtitle: 'Tâches & interventions',
    color: '#27976A',
    roles: ['admin', 'rh', 'employer', 'responsable'],
  },
  {
    key: 'PlanningCalendar',
    icon: 'calendar-month',
    label: 'Mon Planning',
    subtitle: 'Calendrier des tâches',
    color: '#0891B2',
    roles: ['admin', 'rh', 'employer', 'responsable'],
  },
  {
    key: 'BonList',
    icon: 'verified',
    label: 'Bons de Réception',
    subtitle: 'Signer & consulter',
    color: '#C26B1E',
    roles: ['admin', 'rh', 'responsable', 'comptable'],
  },
  {
    key: 'ExpenseList',
    icon: 'account-balance-wallet',
    label: 'Dépenses',
    subtitle: 'Soumettre & suivre',
    color: '#B08718',
    roles: 'all',
  },
  {
    key: 'FacturationMain',
    icon: 'receipt-long',
    label: 'Facturation',
    subtitle: 'Créer des factures Word',
    color: '#163C66',
    roles: ['rh', 'admin', 'comptable'],
  },
  {
    key: 'EmployeeList',
    icon: 'badge',
    label: 'Employés',
    subtitle: 'Gérer & consulter',
    color: '#7C3AED',
    roles: ['rh', 'admin', 'responsable', 'comptable'],
  },
  {
    key: 'AccessRequestList',
    icon: 'vpn-key',
    label: 'Demandes d\'Accès',
    subtitle: 'Gérer les accès',
    color: '#0891B2',
    roles: ['rh', 'admin', 'responsable'],
  },
  {
    key: 'MyAccessList',
    icon: 'vpn-key',
    label: 'Mes Demandes d\'Accès',
    subtitle: 'Suivre mes accès',
    color: '#0891B2',
    roles: ['employer'],
  },
  {
    key: 'PointageForm',
    icon: 'fact-check',
    label: 'Pointage Journalier',
    subtitle: 'Enregistrer la présence',
    color: '#0D9488',
    roles: ['responsable', 'admin'],
  },
  {
    key: 'PointageList',
    icon: 'fact-check',
    label: 'Pointages',
    subtitle: 'Consulter les pointages',
    color: '#0D9488',
    roles: ['admin', 'rh'],
  },
  {
    key: 'MonthlySummary',
    icon: 'summarize',
    label: 'Rapport Mensuel',
    subtitle: 'Résumé financier mensuel',
    color: '#6D28D9',
    roles: ['admin'],
  },
  {
    key: 'CongeManagementMain',
    icon: 'flight-takeoff',
    label: 'Demandes de Congé',
    subtitle: 'Approuver / rejeter',
    color: '#059669',
    roles: ['rh', 'admin'],
  },
  {
    key: 'MyCongeMain',
    icon: 'flight-takeoff',
    label: 'Mes Congés',
    subtitle: 'Solde & demandes',
    color: '#059669',
    // Submitting leave and reading your own balance is open to every role on the
    // backend, but rh, admin and comptable had no way to reach this screen.
    roles: 'all',
  },
];

export default function MenuScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { handleScroll } = useTabBarScroll();
  const role = user?.role;

  const modules = ALL_MODULES.filter(m =>
    m.roles === 'all' || (Array.isArray(m.roles) && m.roles.includes(role))
  );

  const roleLabel = {
    admin: 'Administrateur',
    rh: 'Ressources Humaines',
    employer: 'Employé',
    responsable: 'Responsable',
    comptable: 'Comptable',
  }[role] || role;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../../../assets/mini-logo.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
          <Text style={styles.headerTitle}>Menu</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {modules.map(mod => (
          <TouchableOpacity
            key={mod.key}
            style={styles.card}
            onPress={() => navigation.navigate(mod.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: mod.color + '18' }]}>
              <MaterialIcons name={mod.icon} size={30} color={mod.color} />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardLabel}>{mod.label}</Text>
              <Text style={styles.cardSubtitle}>{mod.subtitle}</Text>
            </View>
            <View style={[styles.cardAccent, { backgroundColor: mod.color }]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  rolePill: {
    backgroundColor: COLORS.primary + '18',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  rolePillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
});
