import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { formatDateForInput } from '../../utils/formatters';

const PlanningCalendarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Explicitement injecter le bouton retour natif
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 8, marginRight: 24, padding: 4 }}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )
    });
  }, [navigation]);
  const [plannings, setPlannings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Custom Filter State for Planning Equipe
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  const canSeeAll = ['admin', 'rh', 'responsable'].includes(user?.role);

  const fetchData = async () => {
    try {
      const [planRes, empRes] = await Promise.all([
        api.get('/planning'),
        api.get('/rh/employees')
      ]);

      const planData = Array.isArray(planRes.data) ? planRes.data : (planRes.data?.data || []);
      setPlannings(planData);

      const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);
      const filteredEmps = empData.filter(e => e.role === 'employer' || e.role === 'responsable');
      setEmployees(filteredEmps);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Data processors
  const visibleTasks = useMemo(() => {
    const selectedDateStr = formatDateForInput(selectedDate);
    
    return plannings.filter(p => {
      if (!p.date) return false;
      const tDateStr = formatDateForInput(p.date);
      if (tDateStr !== selectedDateStr) return false;

      // Role check
      if (!canSeeAll) {
        return p.assignedWorkers?.some(w => (typeof w === 'object' ? w._id : w) === user?.id);
      }

      // Filter check for admins
      if (filterEmployee !== 'all') {
        return p.assignedWorkers?.some(w => (typeof w === 'object' ? w._id : w) === filterEmployee);
      }

      return true;
    });
  }, [plannings, selectedDate, canSeeAll, user, filterEmployee]);

  const getWeekDays = () => {
    const today = new Date(selectedDate);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const week = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime());
        d.setDate(diff + i);
        week.push(d);
    }
    return week;
  };

  const getStatusConfig = (status) => {
    const map = {
      pending: { color: COLORS.warning, label: 'En attente', icon: 'schedule' },
      in_progress: { color: COLORS.primaryDark, label: 'En cours', icon: 'trending-up' },
      completed: { color: COLORS.success, label: 'Terminé', icon: 'check-circle' },
      cancelled: { color: COLORS.danger, label: 'Annulé', icon: 'cancel' }
    };
    return map[status] || { color: COLORS.borderDark, label: 'Autre', icon: 'info' };
  };

  const weekDays = getWeekDays();
  const changeWeek = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset * 7);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
        <Text style={{ marginTop: 12, color: COLORS.primaryDark, fontWeight: '600' }}>Synchronisation du calendrier...</Text>
      </View>
    );
  }

  const activeEmployee = employees.find(e => e._id === filterEmployee);

  return (
    <View style={styles.container}>
      {/* ── Premium Top Header ── */}
      <View style={[styles.header, { paddingTop: 10 }]}>
        {canSeeAll && (
          <View style={styles.adminFilterRow}>
            <TouchableOpacity 
              style={[styles.filterPillBtn, filterEmployee !== 'all' && styles.filterPillBtnActive]} 
              onPress={() => setFilterMenuVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="filter-list" size={18} color={COLORS.white} />
              <Text style={styles.filterPillText}>
                {filterEmployee === 'all' ? "Filtrer l'équipe" : "Filtre Actif"}
              </Text>
              {filterEmployee !== 'all' && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Month & Week Navigation ── */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekBtn}>
            <MaterialIcons name="chevron-left" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.monthPill}>
            <MaterialIcons name="event" size={18} color={COLORS.primaryDark} style={{ marginRight: 6 }} />
            <Text style={styles.monthLabel}>
              {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekBtn}>
            <MaterialIcons name="chevron-right" size={26} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* ── Date Ribbon ── */}
        <View style={styles.weekRibbon}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
            {weekDays.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.dayCard, isSelected && styles.dayCardSelected, isToday && !isSelected && styles.dayCardToday]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayName, isSelected && styles.textWhite]}>
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase()}
                  </Text>
                  <Text style={[styles.dayDate, isSelected && styles.textWhite]}>
                    {String(date.getDate()).padStart(2, '0')}
                  </Text>
                  {isToday && <View style={[styles.todayIndicator, isSelected && { backgroundColor: COLORS.white }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── Tasks Area ── */}
      <ScrollView 
        style={styles.taskList}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryDark} />}
      >
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderDate}>
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <View style={styles.taskCountPill}>
            <Text style={styles.taskCountText}>{visibleTasks.length} tâche{visibleTasks.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Active Filter Indicator */}
        {canSeeAll && filterEmployee !== 'all' && activeEmployee && (
           <View style={styles.activeFilterBanner}>
             <MaterialIcons name="person-pin" size={16} color={COLORS.white} style={{ marginRight: 6 }}/>
             <Text style={styles.activeFilterText}>Filtré pour: {activeEmployee.name}</Text>
             <TouchableOpacity style={styles.clearFilterIcon} onPress={() => setFilterEmployee('all')}>
               <MaterialIcons name="close" size={16} color={COLORS.white} />
             </TouchableOpacity>
           </View>
        )}

        {visibleTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateCircle}>
               <MaterialIcons name="done-all" size={42} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.emptyStateTitle}>Journée libre</Text>
            <Text style={styles.emptyStateText}>Aucune tâche n'est programmée pour cette date.</Text>
          </View>
        ) : (
          visibleTasks.map(task => {
            const config = getStatusConfig(task.status);
            return (
              <TouchableOpacity 
                key={task._id} 
                style={styles.taskCard}
                onPress={() => navigation.navigate('PlanningDetail', { planningId: task._id })}
                activeOpacity={0.8}
              >
                <View style={[styles.taskCardBorder, { backgroundColor: config.color }]} />
                <View style={styles.taskCardInner}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskClient}>{task.client?.name || task.clientName || 'Client Inconnu'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: config.color + '18' }]}>
                      <MaterialIcons name={config.icon} size={12} color={config.color} style={{marginRight: 4}} />
                      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.taskMetaRow}>
                    <MaterialIcons name="apartment" size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
                    <Text style={styles.taskUnite}>{task.unite || 'Unité non spécifiée'}</Text>
                  </View>

                  <Text style={styles.taskDesc} numberOfLines={2}>
                    {task.description || (task.sousTitre?.name) || 'Aucune description fournie.'}
                  </Text>
                  
                  {task.assignedWorkers && task.assignedWorkers.length > 0 && (
                    <View style={styles.workersDivider}>
                      <MaterialIcons name="groups" size={18} color={COLORS.primaryDark} />
                      <Text style={styles.workersText}>
                        {task.assignedWorkers.map(w => typeof w === 'object' ? w.name : 'Membre').join(' • ')}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* ── Filter Modal ── */}
      {filterMenuVisible && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtrer par employé</Text>
                <TouchableOpacity onPress={() => setFilterMenuVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity 
                  style={[styles.filterOption, filterEmployee === 'all' && styles.filterOptionSelected]}
                  onPress={() => { setFilterEmployee('all'); setFilterMenuVisible(false); }}
                >
                  <Text style={[styles.filterOptionText, filterEmployee === 'all' && styles.filterOptionTextSelected]}>
                    Toute l'équipe
                  </Text>
                  {filterEmployee === 'all' && <MaterialIcons name="check" size={20} color={COLORS.primaryDark} />}
                </TouchableOpacity>

                {employees.map(emp => (
                  <TouchableOpacity 
                    key={emp._id}
                    style={[styles.filterOption, filterEmployee === emp._id && styles.filterOptionSelected]}
                    onPress={() => { setFilterEmployee(emp._id); setFilterMenuVisible(false); }}
                  >
                    <Text style={[styles.filterOptionText, filterEmployee === emp._id && styles.filterOptionTextSelected]}>
                      {emp.name}
                    </Text>
                    {filterEmployee === emp._id && <MaterialIcons name="check" size={20} color={COLORS.primaryDark} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Extremely soft app background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#003664', // Deep Navy identity
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#003664',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    zIndex: 10,
  },
  adminFilterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  filterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterPillBtnActive: {
    backgroundColor: '#785A00', // Brass accent
    borderColor: '#785A00',
  },
  filterPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  filterDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003664',
    letterSpacing: 1,
  },
  weekBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  weekRibbon: {
    height: 75,
  },
  weekScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayCard: {
    width: 58,
    height: 75,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dayCardSelected: {
    backgroundColor: '#785A00', // Brass
    shadowColor: '#785A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dayCardToday: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  textWhite: { color: '#FFFFFF' },
  dayDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#785A00',
  },
  taskList: {
    flex: 1,
    padding: 20,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  listHeaderDate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E4D80',
    textTransform: 'capitalize',
  },
  taskCountPill: {
    backgroundColor: '#E8EDF2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003664',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27976A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  activeFilterText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  clearFilterIcon: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003664',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#1E4D80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  taskCardBorder: {
    width: 6,
  },
  taskCardInner: {
    flex: 1,
    padding: 18,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskClient: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003664',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskUnite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  taskDesc: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 16,
    lineHeight: 20,
  },
  workersDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  workersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#003664',
    marginLeft: 8,
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,54,100,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003664',
  },
  modalScroll: {
    marginBottom: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  filterOptionSelected: {
    backgroundColor: '#E8F0FE',
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterOptionTextSelected: {
    color: '#003664',
    fontWeight: '800',
  },
});

export default PlanningCalendarScreen;
