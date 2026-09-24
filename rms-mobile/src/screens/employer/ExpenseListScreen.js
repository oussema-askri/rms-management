import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { Card, LoadingSpinner, EmptyState, StatusBadge } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { canApproveExpense } from '../../utils/permissions';
import { getCategoryLabel, getPaymentMethodLabel } from '../../constants/expenses';

const ExpenseListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      
      let expensesData = [];
      if (Array.isArray(response.data)) {
        expensesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        expensesData = response.data.data;
      }
      
      setExpenses(expensesData);
      applyFilters(expensesData, searchQuery, activeFilter);
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      setExpenses([]);
      setFilteredExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [])
  );

  const applyFilters = (data, search, status) => {
    if (!Array.isArray(data)) {
      setFilteredExpenses([]);
      return;
    }

    let filtered = [...data];

    if (status && status !== 'all') {
      filtered = filtered.filter(e => e && e.status === status);
    }

    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(e => {
        if (!e) return false;
        return (
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.category && e.category.toLowerCase().includes(searchLower))
        );
      });
    }

    setFilteredExpenses(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query || '');
    applyFilters(expenses, query || '', activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter || 'all');
    applyFilters(expenses, searchQuery, filter || 'all');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleApprove = async (expenseId) => {
    Alert.alert(
      'Approuver la dépense',
      'Voulez-vous approuver cette dépense ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            try {
              await api.put(`/expenses/${expenseId}/status`, { status: 'approved' });
              Alert.alert('Succès', 'Dépense approuvée');
              fetchExpenses();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'approuver');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (expenseId) => {
    Alert.alert(
      'Rejeter la dépense',
      'Voulez-vous rejeter cette dépense ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/expenses/${expenseId}/status`, { status: 'rejected' });
              Alert.alert('Succès', 'Dépense rejetée');
              fetchExpenses();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de rejeter');
            }
          },
        },
      ]
    );
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

  const renderExpense = ({ item }) => {
    if (!item) return null;

    const canApprove = canApproveExpense(user?.role) && item.status === 'pending';

    return (
      <Card style={styles.expenseCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </View>
          <StatusBadge status={item.status || 'pending'} />
        </View>

        {/* Description */}
        <Text style={styles.description}>{item.description || 'Sans description'}</Text>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💳</Text>
            <Text style={styles.detailText}>{getPaymentMethodLabel(item.paymentMethod)}</Text>
          </View>
          {item.category && (
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🏷️</Text>
              <Text style={styles.detailText}>{getCategoryLabel(item.category)}</Text>
            </View>
          )}
        </View>

        {/* Created By */}
        {item.createdBy && (
          <Text style={styles.createdBy}>
            Par {item.createdBy.name || 'Utilisateur'}
          </Text>
        )}

        {/* Approval Buttons */}
        {canApprove && (
          <View style={styles.approvalButtons}>
            <TouchableOpacity
              style={[styles.approvalButton, styles.approveButton]}
              onPress={() => handleApprove(item._id)}
            >
              <Text style={styles.approvalButtonText}>✅ Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approvalButton, styles.rejectButton]}
              onPress={() => handleReject(item._id)}
            >
              <Text style={styles.rejectButtonText}>❌ Rejeter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Line */}
        <View
          style={[
            styles.statusLine,
            {
              backgroundColor:
                item.status === 'approved'
                  ? COLORS.success
                  : item.status === 'rejected'
                  ? COLORS.danger
                  : COLORS.warning,
            },
          ]}
        />
      </Card>
    );
  };

  // Calculate totals
  const totalApproved = filteredExpenses
    .filter(e => e && e.status === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

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
        <FilterButton label="Tous" value="all" emoji="💰" />
        <FilterButton label="Attente" value="pending" emoji="⏳" />
        <FilterButton label="Approuvé" value="approved" emoji="✅" />
        <FilterButton label="Rejeté" value="rejected" emoji="❌" />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredExpenses.length} dépense(s)
        </Text>
        <Text style={styles.totalText}>
          Total approuvé: {formatCurrency(totalApproved)}
        </Text>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        renderItem={renderExpense}
        keyExtractor={(item, index) => item?._id?.toString() || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title="Aucune dépense"
            message="Ajoutez une nouvelle dépense"
            actionLabel="Nouvelle dépense"
            onAction={() => navigation.navigate('ExpenseForm')}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 90 }]} 
        onPress={() => navigation.navigate('ExpenseForm')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
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
    fontSize: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  totalText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  expenseCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amountContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2332',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  createdBy: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F0FE',
  },
  approvalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  approvalButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
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
    backgroundColor: '#003664', // primaryDark
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#003664',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
});

export default ExpenseListScreen;