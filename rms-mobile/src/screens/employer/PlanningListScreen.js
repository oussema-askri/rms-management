import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Card, LoadingSpinner, EmptyState, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { canCreatePlanning } from '../../utils/permissions';

const PlanningListScreen = ({ navigation }) => {
  const { user } = useAuth();
  // Employers are not given the create action; the FAB and the empty-state
  // button now agree instead of only the FAB being hidden.
  const canCreate = canCreatePlanning(user?.role);
  const [plannings, setPlannings] = useState([]);
  const [filteredPlannings, setFilteredPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchPlannings = async () => {
    try {
      const response = await api.get('/planning');
      let planningsData = [];
      if (Array.isArray(response.data)) {
        planningsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        planningsData = response.data.data;
      }
      
      setPlannings(planningsData);
      applyFilters(planningsData, searchQuery, activeFilter);
    } catch (error) {
      console.error('❌ Error fetching plannings:', error);
      setPlannings([]);
      setFilteredPlannings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlannings();
    }, [])
  );

  const applyFilters = (data, search, status) => {
    let filtered = [...data];

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.clientName?.toLowerCase().includes(searchLower) ||
        p.unite?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPlannings(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(plannings, query, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(plannings, searchQuery, filter);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlannings();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'in_progress': return COLORS.primary;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.warning;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const FilterButton = ({ label, value, emoji }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(value)}
    >
      <Text style={styles.filterEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.filterText,
          activeFilter === value && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPlanning = ({ item }) => (
    <Card
      onPress={() => navigation.navigate('PlanningDetail', { planningId: item._id })}
      style={styles.planningCard}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.uniteName}>{item.unite}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {/* Description */}
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📊</Text>
          <Text style={styles.detailText}>
            {item.quantite} {item.uniteQuantite}
          </Text>
        </View>
        {item.assignedWorkers?.length > 0 && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👷</Text>
            <Text style={styles.detailText}>
              {item.assignedWorkers.length} ouvrier(s)
            </Text>
          </View>
        )}
      </View>

      {/* Status indicator line */}
      <View 
        style={[
          styles.statusLine, 
          { backgroundColor: getStatusColor(item.status) }
        ]} 
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tous" value="all" emoji="📋" />
        <FilterButton label="En attente" value="pending" emoji="⏳" />
        <FilterButton label="En cours" value="in_progress" emoji="🔧" />
        <FilterButton label="Terminé" value="completed" emoji="✅" />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredPlannings.length} tâche(s) 
          {activeFilter !== 'all' && ` • Filtre: ${activeFilter}`}
        </Text>
      </View>

      {/* Planning List */}
      <FlatList
        data={filteredPlannings}
        renderItem={renderPlanning}
        keyExtractor={(item, index) => item._id?.toString() || String(index)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="Aucune tâche"
            message={
              activeFilter !== 'all'
                ? "Aucune tâche avec ce statut"
                : "Commencez par créer une nouvelle tâche"
            }
            actionLabel={canCreate ? 'Nouvelle tâche' : undefined}
            onAction={canCreate ? () => navigation.navigate('PlanningForm') : undefined}
          />
        }
      />

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 90 }]}
          onPress={() => navigation.navigate('PlanningForm')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F2EE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8F0FE',
    shadowColor: '#1E4D80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  clearIcon: {
    fontSize: 18,
    color: COLORS.textLight,
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8F0FE',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  planningCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  clientInfo: {
    flex: 1,
    marginRight: 10,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a2332',
  },
  uniteName: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
    lineHeight: 19,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8F0FE',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statusLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primaryDark,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default PlanningListScreen;