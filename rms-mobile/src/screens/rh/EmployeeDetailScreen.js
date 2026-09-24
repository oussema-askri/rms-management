import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Card, Button, LoadingSpinner, Input, AuthAvatar } from '../../components/common';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  canSetAvailability,
  canAddPrime,
  canManageEmployees,
  canSeeSalaries,
} from '../../utils/permissions';

const EmployeeDetailScreen = ({ navigation, route }) => {
  const { employeeId } = route.params;
  const { user } = useAuth();
  // These sections were shown to every role, but the backend restricts each of
  // them, so an employer or comptable only ever got a 403.
  const showAvailability = canSetAvailability(user?.role);
  const showPrimes = canAddPrime(user?.role);
  const showEdit = canManageEmployees(user?.role);
  const showSalary = canSeeSalaries(user?.role);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPrimeForm, setShowPrimeForm] = useState(false);
  const [primeData, setPrimeData] = useState({ amount: '', reason: '' });
  const [savingPrime, setSavingPrime] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/rh/employees/${employeeId}`);
      
      const data = response.data?.data || response.data;
      setEmployee(data);
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'employé');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployee();
    }, [employeeId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployee();
  };

  const handleToggleAvailability = async () => {
    setUpdatingAvailability(true);
    try {
      await api.put(`/rh/employees/${employeeId}/availability`, {
        isAvailable: !employee.isAvailable,
      });
      Alert.alert('Succès', 'Disponibilité mise à jour');
      fetchEmployee();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleAddPrime = async () => {
    if (!primeData.amount || parseFloat(primeData.amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    setSavingPrime(true);
    try {
      await api.post(`/rh/employees/${employeeId}/prime`, {
        amount: parseFloat(primeData.amount),
        reason: primeData.reason || 'Prime',
      });
      Alert.alert('Succès', 'Prime ajoutée');
      setPrimeData({ amount: '', reason: '' });
      setShowPrimeForm(false);
      fetchEmployee();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la prime');
    } finally {
      setSavingPrime(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!employee) {
    return null;
  }

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

  const totalPrimes = (employee.primes || []).reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <AuthAvatar path={employee.photo} name={employee.name} size={80} />
        <Text style={styles.employeeName}>{employee.name}</Text>
        <Text style={styles.employeeRole}>{getRoleLabel(employee.role)}</Text>
        
        {/* Availability Badge */}
        <View
          style={[
            styles.availabilityBadge,
            {
              backgroundColor: employee.isAvailable !== false
                ? COLORS.success + '20'
                : COLORS.danger + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.availabilityText,
              { color: employee.isAvailable !== false ? COLORS.success : COLORS.danger },
            ]}
          >
            {employee.isAvailable !== false ? '🟢 Disponible' : '🔴 Indisponible'}
          </Text>
        </View>
      </Card>

      {/* Contact Info */}
      <Card>
        <Text style={styles.sectionTitle}>📋 Informations</Text>
        <InfoRow icon="📧" label="Email" value={employee.email} />
        <InfoRow icon="📞" label="Téléphone" value={employee.phone} />
        <InfoRow icon="🪪" label="CIN" value={employee.cin} />
        <InfoRow icon="📍" label="Adresse" value={employee.address} />
        {showSalary && (
          <InfoRow icon="💰" label="Salaire" value={formatCurrency(employee.salary)} />
        )}
      </Card>

      {/* Edit. EmployeeForm had no entry point anywhere in the app. */}
      {showEdit && (
        <Card>
          <Text style={styles.sectionTitle}>✏️ Modifier</Text>
          <Button
            title="Modifier cet employé"
            onPress={() => navigation.navigate('EmployeeForm', { employeeId })}
          />
        </Card>
      )}

      {/* Availability Toggle. PUT /rh/employees/:id/availability is rh, admin
          and responsable only. */}
      {showAvailability && (
        <Card>
          <Text style={styles.sectionTitle}>🔄 Disponibilité</Text>
          <Button
            title={employee.isAvailable !== false ? 'Marquer Indisponible' : 'Marquer Disponible'}
            variant={employee.isAvailable !== false ? 'danger' : 'success'}
            onPress={handleToggleAvailability}
            loading={updatingAvailability}
          />
        </Card>
      )}

      {/* Primes Section */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            💰 Primes ({employee.primes?.length || 0})
          </Text>
          {showPrimes && (
            <TouchableOpacity
              style={styles.addPrimeButton}
              onPress={() => setShowPrimeForm(!showPrimeForm)}
            >
              <Text style={styles.addPrimeText}>
                {showPrimeForm ? '✕ Annuler' : '+ Ajouter'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Total Primes */}
        <View style={styles.totalPrimes}>
          <Text style={styles.totalPrimesLabel}>Total des primes:</Text>
          <Text style={styles.totalPrimesValue}>{formatCurrency(totalPrimes)}</Text>
        </View>

        {/* Add Prime Form */}
        {showPrimes && showPrimeForm && (
          <View style={styles.primeForm}>
            <Input
              label="Montant (TND)"
              value={primeData.amount}
              onChangeText={(value) => setPrimeData(prev => ({ ...prev, amount: value }))}
              placeholder="0.000"
              keyboardType="decimal-pad"
              icon="💵"
            />
            <Input
              label="Raison"
              value={primeData.reason}
              onChangeText={(value) => setPrimeData(prev => ({ ...prev, reason: value }))}
              placeholder="Raison de la prime..."
              icon="📝"
            />
            <Button
              title="Ajouter la prime"
              onPress={handleAddPrime}
              loading={savingPrime}
            />
          </View>
        )}

        {/* Primes List */}
        {employee.primes && employee.primes.length > 0 ? (
          employee.primes.map((prime, index) => (
            <View key={index} style={styles.primeItem}>
              <View style={styles.primeInfo}>
                <Text style={styles.primeAmount}>{formatCurrency(prime.amount)}</Text>
                <Text style={styles.primeReason}>{prime.reason || 'Prime'}</Text>
              </View>
              <Text style={styles.primeDate}>{formatDate(prime.date)}</Text>
            </View>
          ))
        ) : (
          !showPrimeForm && (
            <Text style={styles.noPrimes}>Aucune prime enregistrée</Text>
          )
        )}
      </Card>

      {/* Vacation Dates */}
      {employee.vacationDates && employee.vacationDates.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>🏖️ Congés</Text>
          {employee.vacationDates.map((vacation, index) => (
            <View key={index} style={styles.vacationItem}>
              <Text style={styles.vacationDates}>
                {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
              </Text>
              {vacation.reason && (
                <Text style={styles.vacationReason}>{vacation.reason}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  availabilityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPrimeButton: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPrimeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  totalPrimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  totalPrimesLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  totalPrimesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  primeForm: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  primeInfo: {
    flex: 1,
  },
  primeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  primeReason: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  primeDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  noPrimes: {
    textAlign: 'center',
    color: COLORS.textLight,
    paddingVertical: 16,
  },
  vacationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vacationDates: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  vacationReason: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 30,
  },
});

export default EmployeeDetailScreen;