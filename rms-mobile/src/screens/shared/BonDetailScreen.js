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
import * as Sharing from 'expo-sharing';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { downloadStoredFile } from '../../api/files';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, LoadingSpinner, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/formatters';
import { canSignBon } from '../../utils/permissions';

const BonDetailScreen = ({ navigation, route }) => {
  const { bonId } = route.params;
  const { user } = useAuth();
  const [bon, setBon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchBon = async () => {
    try {
      const response = await api.get(`/bon-de-reception/${bonId}`);
      
      const data = response.data?.data || response.data;
      setBon(data);
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Erreur', 'Impossible de charger le bon');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBon();
    }, [bonId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBon();
  };

  const handleSign = () => {
    Alert.alert(
      'Signer le Bon de Réception',
      'Cette action va verrouiller le bon et générer le document. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signer',
          onPress: async () => {
            setSigning(true);
            try {
              await api.post(`/bon-de-reception/${bonId}/sign`);
              Alert.alert('Succès ✅', 'Bon signé avec succès');
              fetchBon();
            } catch (error) {
              Alert.alert(
                'Erreur',
                error.response?.data?.message || 'Impossible de signer le bon'
              );
            } finally {
              setSigning(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (!bon?.docxPath) {
      Alert.alert('Info', 'Le document n\'est pas encore généré. Signez d\'abord le bon.');
      return;
    }

    setDownloading(true);
    try {
      // downloadStoredFile builds the URL and attaches the session token,
      // which /uploads now requires. It throws with a readable message on a
      // non-200 response instead of writing the error body to a .docx.
      const fileName = `bon_${bon.bonNumber}.docx`;
      const uri = await downloadStoredFile(bon.docxPath, fileName);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Succès', `Document téléchargé: ${fileName}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger le document');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!bon) {
    return null;
  }

  const taches = bon.taches || [];
  const canSign = canSignBon(user?.role) && bon.status === 'active' && taches.length > 0;

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
        <View style={styles.headerTop}>
          <View style={styles.bonNumberBadge}>
            <Text style={styles.bonNumber}>{bon.bonNumber || 'N/A'}</Text>
          </View>
          <StatusBadge status={bon.status || 'active'} />
        </View>
        
        <Text style={styles.clientName}>{bon.clientName}</Text>
        <Text style={styles.uniteName}>
          {bon.unite} ({bon.uniteNumber})
        </Text>
      </Card>

      {/* Signed Info */}
      {bon.status === 'signed' && (
        <Card style={styles.signedCard}>
          <View style={styles.signedHeader}>
            <Text style={styles.signedIcon}>✅</Text>
            <Text style={styles.signedTitle}>Bon Signé</Text>
          </View>
          <Text style={styles.signedDetails}>
            Signé le {formatDate(bon.signedAt)}
            {bon.signedBy?.name && ` par ${bon.signedBy.name}`}
          </Text>
        </Card>
      )}

      {/* Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📋 Tâches ({taches.length})</Text>
      </View>

      {taches.length === 0 ? (
        <Card>
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Aucune tâche dans ce bon</Text>
            <Text style={styles.emptySubtext}>
              Les tâches sont ajoutées automatiquement lorsqu'elles sont marquées comme terminées
            </Text>
          </View>
        </Card>
      ) : (
        taches.map((tache, index) => (
          <Card key={tache._id || index} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.taskNumber}>
                <Text style={styles.taskNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.taskWorkType}>
                {tache.description || `Tâche ${index + 1}`}
              </Text>
            </View>

            <View style={styles.taskDetails}>
              <View style={styles.taskDetailItem}>
                <Text style={styles.taskDetailIcon}>📅</Text>
                <Text style={styles.taskDetailText}>
                  {formatDate(tache.dateCompleted)}
                </Text>
              </View>
              <View style={styles.taskDetailItem}>
                <Text style={styles.taskDetailIcon}>📊</Text>
                <Text style={styles.taskDetailText}>
                  {tache.quantite || 0} {tache.uniteQuantite || ''}
                </Text>
              </View>
            </View>

            {tache.materielsNecessaires && (
              <View style={styles.materialsSection}>
                <Text style={styles.materialsLabel}>🧰 Matériels:</Text>
                <Text style={styles.materialsText}>{tache.materielsNecessaires}</Text>
              </View>
            )}

            {tache.assignedWorkers?.length > 0 && (
              <View style={styles.workersSection}>
                <Text style={styles.workersLabel}>👷 Ouvriers:</Text>
                <View style={styles.workersList}>
                  {tache.assignedWorkers.map((worker, wIndex) => (
                    <View key={wIndex} style={styles.workerChip}>
                      <Text style={styles.workerName}>
                        {worker.name || 'Ouvrier'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        ))
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {canSign && (
          <Button
            title="✍️ Signer le Bon"
            onPress={handleSign}
            loading={signing}
            variant="success"
            style={styles.signButton}
          />
        )}

        {bon.status === 'signed' && (
          <Button
            title="📥 Télécharger Document"
            onPress={handleDownload}
            loading={downloading}
            variant="primary"
            style={styles.downloadButton}
          />
        )}
      </View>

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
  // The InfoRow component referenced these five styles but none were defined,
  // so every info row on this screen rendered unstyled.
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
  headerCard: {
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bonNumberBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bonNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  uniteName: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  signedCard: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: 12,
  },
  signedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  signedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  signedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  signedDetails: {
    fontSize: 14,
    color: COLORS.success,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskCard: {
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  taskNumberText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskWorkType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 10,
    lineHeight: 20,
  },
  taskDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  taskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDetailIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  taskDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  materialsSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  materialsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  materialsText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  workersSection: {
    marginTop: 8,
  },
  workersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  workersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  workerChip: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workerName: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 12,
  },
  signButton: {
    backgroundColor: COLORS.success,
  },
  downloadButton: {},
  bottomSpacer: {
    height: 30,
  },
});

export default BonDetailScreen;