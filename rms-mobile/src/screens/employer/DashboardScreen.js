import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/config';
import { useTabBarScroll } from '../../navigation/TabNavigator';
import api from '../../api/axios';
import { unwrapList } from '../../api/unwrap';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { handleScroll } = useTabBarScroll();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    clients: 0,
    planningPending: 0,
    planningInProgress: 0,
    planningCompleted: 0,
    activeBons: 0,
    expensesPending: 0,
    expensesTotal: 0,
  });

  const fetchDashboardData = async () => {
    try {
      let clients = [], planning = [], bons = [], expenses = [];

      try {
        const r = await api.get('/clients');
        clients = unwrapList(r);
      } catch (e) {}

      try {
        const r = await api.get('/planning');
        planning = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.plannings || []);
      } catch (e) {}

      try {
        const r = await api.get('/bon-de-reception');
        bons = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      } catch (e) {}

      try {
        const r = await api.get('/expenses');
        expenses = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      } catch (e) {}

      let employees = [];
      let congesList = [];
      if (user?.role === 'rh' || user?.role === 'admin') {
        try {
          const r1 = await api.get('/rh/employees');
          employees = Array.isArray(r1.data) ? r1.data : (r1.data?.data || []);
        } catch(e) {}
        try {
          const r2 = await api.get('/rh/conge');
          congesList = Array.isArray(r2.data) ? r2.data : (r2.data?.data || []);
        } catch(e) {}
      }

      setStats({
        clients: clients.length,
        planningPending: planning.filter(p => p.status === 'pending').length,
        planningInProgress: planning.filter(p => p.status === 'in_progress').length,
        planningCompleted: planning.filter(p => p.status === 'completed').length,
        activeBons: bons.filter(b => b.status === 'active').length,
        expensesPending: expenses.filter(e => e.status === 'pending').length,
        expensesTotal: expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0),
        rhEmployees: employees.length,
        rhCongesPending: congesList.filter(c => c.status === 'pending').length,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboardData(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      rh: 'Ressources Humaines',
      responsable: 'Responsable',
      comptable: 'Comptable',
      employer: 'Employé',
    };
    return labels[role] || 'Employé';
  };

  const goTo = (screen) => navigation.navigate('Menu', { screen });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TopAppBar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 16, height: 64 + insets.top }]}>
        <View style={styles.appBarLeft}>
          <Image source={require('../../../assets/mini-logo.png')} style={styles.appBarLogo} resizeMode="contain" />
          <Text style={styles.appBarTitle}>RMS</Text>
        </View>
        {/* This was a TouchableOpacity with no onPress: it looked tappable and
            did nothing. It now opens the profile, which is what the icon implies. */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Mon profil"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="account-circle" size={28} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingTop: 64 + insets.top + 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingTitle}>Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{getRoleLabel(user?.role).toUpperCase()}</Text>
          </View>
        </View>

        {user?.role === 'admin' ? (
          <>
            <View style={[styles.section, { paddingHorizontal: 16, marginTop: 10 }]}>
            <Text style={styles.sectionHeaderTitle}>Aperçu Stratégique</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              
              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: COLORS.primaryDark }]} onPress={() => goTo('PlanningList')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="assignment" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>TÂCHES</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.planningInProgress + stats.planningPending}</Text>
                <Text style={styles.statCardHSubtitle}>Travaux actifs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: COLORS.secondary }]} onPress={() => goTo('BonList')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="verified" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>BONS</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.activeBons}</Text>
                <Text style={styles.statCardHSubtitle}>Bons en cours</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: '#C2410C' }]} onPress={() => goTo('ExpenseList')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="account-balance-wallet" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>DÉPENSES</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.expensesPending}</Text>
                <Text style={styles.statCardHSubtitle}>En attente</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: '#7C3AED' }]} onPress={() => goTo('EmployeeList')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="badge" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>EFFECTIF</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.rhEmployees}</Text>
                <Text style={styles.statCardHSubtitle}>Employés Inscrits</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: '#059669' }]} onPress={() => goTo('CongeManagementMain')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="flight-takeoff" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>CONGÉS</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.rhCongesPending}</Text>
                <Text style={styles.statCardHSubtitle}>Demandes en attente</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statCardH, { width: '48%', marginRight: 0, backgroundColor: COLORS.primary }]} onPress={() => goTo('ClientList')} activeOpacity={0.8}>
                <View style={styles.statCardHTop}>
                  <MaterialIcons name="group" size={18} color={COLORS.white + 'CC'} />
                  <Text style={styles.statCardHTitle}>CLIENTS</Text>
                </View>
                <Text style={styles.statCardHValue}>{stats.clients}</Text>
                <Text style={styles.statCardHSubtitle}>Clients inscrits</Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* Quick Actions Grid for Admin */}
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Menu Rapide (Actions)</Text>
            <View style={styles.quickGrid}>
              {[
                { icon: 'group', label: 'Clients', screen: 'ClientList', bg: COLORS.primaryDark },
                { icon: 'task', label: 'Tâches', screen: 'PlanningList', bg: COLORS.primary },
                { icon: 'badge', label: 'Employés', screen: 'EmployeeList', bg: '#7C3AED' },
                { icon: 'verified', label: 'Bons Récept.', screen: 'BonList', bg: COLORS.secondary },
                { icon: 'receipt-long', label: 'Factures', screen: 'FacturationMain', bg: COLORS.primaryDark },
                { icon: 'account-balance-wallet', label: 'Dépenses', screen: 'ExpenseList', bg: COLORS.primary },
                { icon: 'flight-takeoff', label: 'Congés', screen: 'CongeManagementMain', bg: '#059669' },
                { icon: 'vpn-key', label: 'Accès', screen: 'AccessRequestList', bg: COLORS.borderDark, text: COLORS.primaryDark }
              ].map((item, index) => (
                <TouchableOpacity key={index} style={styles.quickBtn} onPress={() => goTo(item.screen)} activeOpacity={0.8}>
                  <View style={[styles.quickBtnIconbox, { backgroundColor: item.bg }]}>
                    <MaterialIcons name={item.icon} size={22} color={item.text || COLORS.white} />
                  </View>
                  <Text style={styles.quickBtnLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
        ) : (
          <>
            {/* Horizontal Scroll Stats */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.statsScroll} 
              contentContainerStyle={styles.statsScrollContent}
            >
              {user?.role === 'rh' ? (
                <>
                  <View style={[styles.statCardH, { backgroundColor: '#7C3AED' }]}>
                    <View style={styles.statCardHTop}>
                      <MaterialIcons name="badge" size={18} color={COLORS.white + 'CC'} />
                      <Text style={styles.statCardHTitle}>EFFECTIF</Text>
                    </View>
                    <Text style={styles.statCardHValue}>{stats.rhEmployees}</Text>
                    <Text style={styles.statCardHSubtitle}>Employés inscrits</Text>
                  </View>
                  <View style={[styles.statCardH, { backgroundColor: '#059669' }]}>
                    <View style={styles.statCardHTop}>
                      <MaterialIcons name="flight-takeoff" size={18} color={COLORS.white + 'CC'} />
                      <Text style={styles.statCardHTitle}>CONGÉS</Text>
                    </View>
                    <Text style={styles.statCardHValue}>{stats.rhCongesPending}</Text>
                    <Text style={styles.statCardHSubtitle}>Demandes en attente</Text>
                  </View>
                </>
              ) : (
                <>
                  {user?.role === 'comptable' ? (
                    <View style={[styles.statCardH, { backgroundColor: COLORS.primaryDark }]}>
                      <View style={styles.statCardHTop}>
                        <MaterialIcons name="account-balance-wallet" size={18} color={COLORS.white + 'CC'} />
                        <Text style={styles.statCardHTitle}>DÉPENSES</Text>
                      </View>
                      <Text style={styles.statCardHValue}>{stats.expensesPending}</Text>
                      <Text style={styles.statCardHSubtitle}>Dépenses en attente</Text>
                    </View>
                  ) : (
                    <View style={[styles.statCardH, { backgroundColor: COLORS.primaryDark }]}>
                      <View style={styles.statCardHTop}>
                        <MaterialIcons name="assignment" size={18} color={COLORS.white + 'CC'} />
                        <Text style={styles.statCardHTitle}>AUJOURD'HUI</Text>
                      </View>
                      <Text style={styles.statCardHValue}>{String(stats.planningPending + stats.planningInProgress).padStart(2, '0')}</Text>
                      <Text style={styles.statCardHSubtitle}>Tâches du jour</Text>
                    </View>
                  )}

                </>
              )}
            </ScrollView>

            {/* Quick Actions Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Actions Rapides</Text>
              <View style={styles.quickGrid}>
                {(user?.role === 'comptable' ? [
                  { icon: 'receipt-long', label: 'Facturation', screen: 'FacturationMain', bg: COLORS.primaryDark },
                  { icon: 'verified', label: 'Bons de Réception', screen: 'BonList', bg: COLORS.secondary },
                  { icon: 'account-balance-wallet', label: 'Dépenses', screen: 'ExpenseList', bg: COLORS.primary },
                  { icon: 'group', label: 'Clients', screen: 'ClientList', bg: COLORS.borderDark, text: COLORS.primaryDark }
                ] : user?.role === 'rh' ? [
                  { icon: 'badge', label: 'Employés', screen: 'EmployeeList', bg: '#7C3AED' },
                  { icon: 'flight-takeoff', label: 'Demandes Congés', screen: 'CongeManagementMain', bg: '#059669' },
                  { icon: 'vpn-key', label: 'Accès', screen: 'AccessRequestList', bg: COLORS.primaryDark },
                  { icon: 'account-balance-wallet', label: 'Dépenses', screen: 'ExpenseList', bg: COLORS.secondary }
                ] : [
                  { icon: 'receipt-long', label: 'Nouvelle Dépense', screen: 'ExpenseForm', bg: COLORS.secondary },
                  { icon: 'calendar-month', label: 'Mon Planning', screen: 'PlanningCalendar', bg: COLORS.primaryDark },
                  { icon: 'flight-takeoff', label: 'Demande de Congé', screen: 'MyCongeMain', bg: COLORS.primary },
                  { icon: 'task', label: 'Tâches', screen: 'PlanningList', bg: COLORS.borderDark, text: COLORS.primaryDark }
                ]).map((item, index) => (
                  <TouchableOpacity key={index} style={styles.quickBtn} onPress={() => goTo(item.screen)} activeOpacity={0.8}>
                    <View style={[styles.quickBtnIconbox, { backgroundColor: item.bg }]}>
                      <MaterialIcons name={item.icon} size={22} color={item.text || COLORS.white} />
                    </View>
                    <Text style={styles.quickBtnLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Tasks Section */}
        {user?.role !== 'comptable' && user?.role !== 'rh' && (
          <View style={styles.section}>
            <View style={styles.taskListHeader}>
              <Text style={styles.sectionHeaderTitle}>Tâches d'aujourd'hui</Text>
              <TouchableOpacity onPress={() => goTo('PlanningList')}>
                <Text style={styles.seeAllText}>VOIR TOUT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.taskList}>
              {stats.planningInProgress > 0 && (
                <View style={[styles.taskCard, styles.taskCardActive]}>
                  <View style={styles.taskCardHeader}>
                    <View>
                      <Text style={styles.taskTitle}>Plannings en cours</Text>
                      <Text style={styles.taskSubtitle}>{stats.planningInProgress} tâches actives rapportées</Text>
                    </View>
                    <View style={styles.taskChipActive}>
                      <Text style={styles.taskChipTextActive}>EN COURS</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.taskCard}>
                <View style={styles.taskCardHeader}>
                  <View>
                    <Text style={styles.taskTitle}>Plannings assignés</Text>
                    <Text style={styles.taskSubtitle}>{stats.planningPending} tâches en attente</Text>
                  </View>
                  <View style={styles.taskChipPending}>
                    <Text style={styles.taskChipTextPending}>EN ATTENTE</Text>
                  </View>
                </View>
              </View>

            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1a2332',
    fontWeight: '500',
  },
  
  // Top App Bar
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background + 'EE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 5,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight,
    borderWidth: 2,
    borderColor: COLORS.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  appBarLogo: {
    width: 32,
    height: 32,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
  },

  // Welcome
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: COLORS.secondaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Horizontal Scroll Cards
  statsScroll: {
    marginBottom: 36,
  },
  statsScrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  statCardH: {
    width: 250,
    padding: 20,
    borderRadius: 16,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  statCardHTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statCardHTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white + 'B3',
    letterSpacing: -0.5,
  },
  statCardHValue: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
    marginBottom: 2,
    lineHeight: 48,
  },
  statCardHSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white + 'CC',
  },

  // Quick Actions
  section: {
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  quickBtn: {
    width: '47%',
    backgroundColor: COLORS.borderLight,
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  quickBtnIconbox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // Task List
  taskListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 1.5,
  },
  taskList: {
    gap: 16,
  },
  taskCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
  },
  taskCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  taskChipActive: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskChipTextActive: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.secondaryDark,
    letterSpacing: 0.5,
  },
  taskChipPending: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskChipTextPending: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  taskChipTextInfo: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
