import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { LoadingSpinner } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import * as Sharing from 'expo-sharing';
import { downloadStoredFile } from '../../api/files';

const AccessRequestDetailScreen = ({ route, navigation }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { isRH, isAdmin } = useAuth();
  const canApprove = typeof isRH === 'function' ? isRH() : false;

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/rh/access-requests/${requestId}`);
      setRequest(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    const label = status === 'approved' ? 'approuver' : 'rejeter';
    Alert.alert(
      'Confirmation',
      `Voulez-vous ${label} cette demande?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setUpdating(true);
              const response = await api.patch(`/rh/access-requests/${requestId}/status`, { status });
              setRequest(response.data.data);
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

  const downloadDocument = async () => {
    if (!request.docxPath) {
      Alert.alert('Information', 'Aucun document disponible');
      return;
    }

    try {
      setDownloading(true);
      const uri = await downloadStoredFile(request.docxPath, `access-request-${requestId}.docx`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Succès', 'Document téléchargé');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger le document');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return COLORS.success;
      case 'rejected':
        return COLORS.danger;
      case 'pending':
      default:
        return COLORS.warning;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      case 'pending':
      default:
        return 'En attente';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Demande introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Status Badge */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(request.status) }]}>
        <Text style={styles.statusBannerText}>{getStatusLabel(request.status)}</Text>
      </View>

      {/* Mission Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informations de la Mission</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(request.missionDate)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Lieu:</Text>
          <Text style={styles.infoValue}>{request.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durée:</Text>
          <Text style={styles.infoValue}>{request.duration}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Objet:</Text>
          <Text style={styles.infoValue}>{request.purpose}</Text>
        </View>
      </View>

      {/* Workers */}
      {request.workers && request.workers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👷 Travailleurs ({request.workers.length})</Text>

          {request.workers.map((worker, index) => (
            <View key={index} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <Text style={styles.workerNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{worker.name}</Text>
                <Text style={styles.workerCin}>CIN: {worker.cin}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Vehicle */}
      {request.vehicle && (request.vehicle.type || request.vehicle.matricule) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Véhicule</Text>

          {request.vehicle.type && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{request.vehicle.type}</Text>
            </View>
          )}

          {request.vehicle.matricule && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Matricule:</Text>
              <Text style={styles.infoValue}>{request.vehicle.matricule}</Text>
            </View>
          )}
        </View>
      )}

      {/* Created By */}
      {request.createdBy && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Créé par</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom:</Text>
            <Text style={styles.infoValue}>{request.createdBy.name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(request.createdAt)}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {canApprove && request.status === 'pending' && (
          <View style={styles.approvalRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, { flex: 1 }]}
              onPress={() => updateStatus('approved')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {updating ? '...' : '✓  Approuver'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, { flex: 1 }]}
              onPress={() => updateStatus('rejected')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {updating ? '...' : '✕  Rejeter'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {canApprove && request.status !== 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => updateStatus('pending')}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>
              {updating ? '...' : 'Remettre En Attente'}
            </Text>
          </TouchableOpacity>
        )}

        {request.docxPath && (
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={downloadDocument}
            disabled={downloading}
          >
            <Text style={styles.actionButtonText}>
              {downloading ? 'Téléchargement...' : 'Télécharger Document'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('AccessRequestForm', { requestId })}
        >
          <Text style={styles.actionButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBannerText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  workerCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerNumber: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  workerCin: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actions: {
    gap: 12,
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  pendingButton: {
    backgroundColor: COLORS.warning,
  },
  downloadButton: {
    backgroundColor: COLORS.primaryLight,
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textLight,
  },
});

export default AccessRequestDetailScreen;
