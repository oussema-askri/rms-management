import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Card, LoadingSpinner, EmptyState, AuthAvatar } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { canManageEmployees } from '../../utils/permissions';

const EmployeeListScreen = ({ navigation }) => {
  const { user, isAdmin, isRH, isComptable } = useAuth();
  // EmployeeForm was registered in the navigator but nothing ever navigated to
  // it, so creating an employee was impossible from the app.
  const canManage = canManageEmployees(user?.role);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/rh/employees');
      
      let employeesData = [];
      if (Array.isArray(response.data)) {
        employeesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        employeesData = response.data.data;
      }
      
      setEmployees(employeesData);
      setFilteredEmployees(employeesData);
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const handleSearch = (query) => {
    setSearchQuery(query || '');
    if (!query || !query.trim()) {
      setFilteredEmployees(employees);
    } else {
      const searchLower = query.toLowerCase();
      const filtered = employees.filter(emp => {
        if (!emp) return false;
        return (
          (emp.name && emp.name.toLowerCase().includes(searchLower)) ||
          (emp.email && emp.email.toLowerCase().includes(searchLower)) ||
          (emp.role && emp.role.toLowerCase().includes(searchLower))
        );
      });
      setFilteredEmployees(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const handleResetPassword = (emp) => {
    Alert.alert(
      'Réinitialiser le mot de passe',
      `Réinitialiser le mot de passe de ${emp.name} ?

` +
        'Un mot de passe temporaire sera généré et affiché une seule fois.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/admin/users/${emp._id}/reset-password`);
              // Returned once and never retrievable again.
              Alert.alert(
                'Mot de passe temporaire',
                `${response.data.message}

${response.data.temporaryPassword}

` +
                  'Notez-le maintenant, il ne sera plus affiché.'
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de réinitialiser le mot de passe');
            }
          },
        },
      ]
    );
  };

  const canSeeFinancials = (typeof isAdmin === 'function' && isAdmin())
    || (typeof isRH === 'function' && isRH())
    || (typeof isComptable === 'function' && isComptable());

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Administrateur',
      rh: 'RH',
      employer: 'Employé',
      responsable: 'Responsable',
      comptable: 'Comptable',
    };
    return roles[role] || role || 'N/A';
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return COLORS.danger;
      case 'rh': return COLORS.primary;
      case 'responsable': return '#7C3AED';
      case 'comptable': return '#D97706';
      default: return COLORS.success;
    }
  };

  const getTypeLabel = (type) => {
    const types = { salarie: 'Salarié', taux_journalier: 'Journalier', prestataire: 'Prestataire' };
    return types[type] || 'Salarié';
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'taux_journalier': return '#059669';
      case 'prestataire': return '#7C3AED';
      default: return '#0891B2';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderEmployee = ({ item }) => {
    if (!item) return null;

    return (
      <Card
        onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item._id })}
        style={styles.employeeCard}
      >
        <View style={styles.cardHeader}>
          {/* The uploaded photo was never rendered anywhere in the app.
              AuthAvatar sends the token and falls back to the initial. */}
          <AuthAvatar
            path={item.photo}
            name={item.name}
            size={50}
            style={{ marginRight: 12 }}
          />
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{item.name || 'N/A'}</Text>
            <Text style={styles.employeeEmail}>{item.email || 'N/A'}</Text>
          </View>
          <View style={{ gap: 4, alignItems: 'flex-end' }}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {getRoleLabel(item.role)}
              </Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getTypeColor(item.employeeType) + '15' }]}>
              <Text style={[styles.roleText, { color: getTypeColor(item.employeeType), fontSize: 10 }]}>
                {getTypeLabel(item.employeeType)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
          {item.phone && (
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📞</Text>
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>
              {item.isAvailable !== false ? '🟢' : '🔴'}
            </Text>
            <Text style={styles.detailText}>
              {item.isAvailable !== false ? 'Disponible' : 'Indisponible'}
            </Text>
          </View>
        </View>

        {/* Salary / daily rate (only for authorized roles) */}
        {canSeeFinancials && (
          <View style={styles.primesIndicator}>
            <Text style={styles.primesText}>
              {item.employeeType === 'taux_journalier'
                ? `📅 ${item.dailyRate || 0} TND/jour`
                : `💵 ${item.salary || 0} TND/mois`}
            </Text>
          </View>
        )}

        {/* Primes indicator */}
        {item.primes && item.primes.length > 0 && (
          <View style={styles.primesIndicator}>
            <Text style={styles.primesText}>
              💰 {item.primes.length} prime(s)
            </Text>
          </View>
        )}

        {/* Admin: reset password */}
        {typeof isAdmin === 'function' && isAdmin() && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => handleResetPassword(item)}
          >
            <Text style={styles.resetBtnText}>🔑 Réinitialiser mot de passe</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un employé..."
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

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredEmployees.length} employé(s)
        </Text>
        <Text style={styles.statsText}>
          {employees.filter(e => e && e.isAvailable !== false).length} disponible(s)
        </Text>
      </View>

      {/* Employee List */}
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployee}
        keyExtractor={(item, index) => item?._id?.toString() || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="Aucun employé"
            message="Aucun employé trouvé"
          />
        }
      />

      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EmployeeForm')}
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
    backgroundColor: COLORS.background,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  clearIcon: {
    fontSize: 18,
    color: COLORS.textLight,
    padding: 4,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  employeeCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  employeeEmail: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  primesIndicator: {
    marginTop: 10,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  primesText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  resetBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '600',
  },
});

export default EmployeeListScreen;