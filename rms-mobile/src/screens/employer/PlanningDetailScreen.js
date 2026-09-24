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
import { useAuth } from '../../context/AuthContext';
import { Card, LoadingSpinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/formatters';
import { canEditPlanning, canDeletePlanning, canChangePlanningStatus } from '../../utils/permissions';

const PlanningDetailScreen = ({ navigation, route }) => {
  const { planningId } = route.params;
  const { user } = useAuth();
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchPlanning = async () => {
    try {
      const response = await api.get(`/planning/${planningId}`);
      
      const data = response.data?.data || response.data;
      setPlanning(data);
    } catch (error) {
      console.error('Error loading planning:', error);
      Alert.alert('Erreur', 'Impossible de charger la tâche');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlanning();
    }, [planningId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlanning();
  };

  const handleStatusChange = async (newStatus) => {
    const statusLabels = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };

    Alert.alert(
      'Changer le statut',
      `Changer le statut en "${statusLabels[newStatus]}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdating(true);
            try {
              await api.put(`/planning/${planningId}`, { status: newStatus });
              Alert.alert('Succès', 'Statut mis à jour');
              fetchPlanning();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la tâche',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/planning/${planningId}`);
              Alert.alert('Succès', 'Tâche supprimée');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!planning) {
    return null;
  }

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  const StatusButton = ({ status, label, emoji, color }) => (
    <TouchableOpacity
      style={[
        styles.statusButton,
        planning.status === status && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => handleStatusChange(status)}
      disabled={updating || planning.status === status}
    >
      <Text style={styles.statusButtonEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.statusButtonText,
          planning.status === status && { color: COLORS.white },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
        <View style={styles.headerTop}>
          <StatusBadge status={planning.status} />
          {canEditPlanning(user?.role) && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('PlanningForm', { planningId })}
              >
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              {canDeletePlanning(user?.role) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* The heading used to render planning.workType, a field removed from the
            Planning model, so it was always blank. The client leads instead; the
            description has its own card below. */}
        <Text style={styles.taskTitle}>{planning.clientName}</Text>
        <Text style={styles.uniteName}>{planning.unite}</Text>
      </Card>

      {/* Quick Status Change. Changing status is a PUT /planning/:id, which the
          backend restricts to rh and admin; everyone else got a 403. */}
      {canChangePlanningStatus(user?.role) && (
        <Card>
          <Text style={styles.sectionTitle}>📊 Changer le Statut</Text>
          <View style={styles.statusButtonsContainer}>
            <StatusButton
              status="pending"
              label="En attente"
              emoji="⏳"
              color={COLORS.warning}
            />
            <StatusButton
              status="in_progress"
              label="En cours"
              emoji="🔧"
              color={COLORS.primary}
            />
            <StatusButton
              status="completed"
              label="Terminé"
              emoji="✅"
              color={COLORS.success}
            />
            <StatusButton
              status="cancelled"
              label="Annulé"
              emoji="❌"
              color={COLORS.danger}
            />
          </View>
        </Card>
      )}

      {/* Details */}
      <Card>
        <Text style={styles.sectionTitle}>📋 Détails</Text>
        <InfoRow icon="📅" label="Date" value={formatDate(planning.date)} />
        <InfoRow 
          icon="📊" 
          label="Quantité" 
          value={`${planning.quantite} ${planning.uniteQuantite}`} 
        />
        {planning.sousTitre && (
          <InfoRow icon="📍" label="Sous-titre" value={planning.sousTitre} />
        )}
      </Card>

      {/* Description */}
      {planning.description && (
        <Card>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.descriptionText}>{planning.description}</Text>
        </Card>
      )}

      {/* Materials */}
      {planning.materielsNecessaires && (
        <Card>
          <Text style={styles.sectionTitle}>🧰 Matériels Nécessaires</Text>
          <Text style={styles.descriptionText}>{planning.materielsNecessaires}</Text>
        </Card>
      )}

      {/* Assigned Workers */}
      {planning.assignedWorkers?.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>
            👷 Ouvriers Assignés ({planning.assignedWorkers.length})
          </Text>
          <View style={styles.workersContainer}>
            {planning.assignedWorkers.map((worker, index) => (
              <View key={worker._id || index} style={styles.workerChip}>
                <Text style={styles.workerEmoji}>👤</Text>
                <Text style={styles.workerName}>
                  {worker.name || 'Ouvrier'}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Created Info */}
      <Card style={styles.footerCard}>
        <Text style={styles.footerText}>
          Créé le {formatDate(planning.createdAt)}
          {planning.createdBy && ` par ${planning.createdBy.name || 'Utilisateur'}`}
        </Text>
      </Card>

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
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.danger + '15',
  },
  actionIcon: {
    fontSize: 18,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  uniteName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  statusButtonEmoji: {
    fontSize: 16,
  },
  statusButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
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
  descriptionText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  workersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  workerEmoji: {
    fontSize: 16,
  },
  workerName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footerCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default PlanningDetailScreen;