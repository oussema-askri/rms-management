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
import { Card, Button, LoadingSpinner } from '../../components/common';
import { formatPhone } from '../../utils/formatters';
import { unwrap } from '../../api/unwrap';
import {
  canEditClient,
  canDeleteClient,
  canCreateUnite,
  canDeleteUnite,
  canCreateSousTitre,
  canDeleteSousTitre,
} from '../../utils/permissions';

const ClientDetailScreen = ({ navigation, route }) => {
  const { clientId } = route.params;
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${clientId}`);


      const clientData = unwrap(response);

      if (clientData) {
        setClient(clientData);
      } else {
        Alert.alert('Erreur', 'Client non trouvé');
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Erreur', 'Impossible de charger le client');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClient();
    }, [clientId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClient();
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ${client.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/clients/${clientId}`);
              Alert.alert('Succès', 'Client supprimé');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUnite = (uniteId, uniteName) => {
    Alert.alert(
      'Supprimer l\'unité',
      `Supprimer ${uniteName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/clients/${clientId}/unites/${uniteId}`);
              fetchClient(); // Refresh after delete
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'unité');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSousTitre = (uniteId, sousTitreId, sousTitreName) => {
    Alert.alert(
      'Supprimer le sous-titre',
      `Supprimer ${sousTitreName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/clients/${clientId}/unites/${uniteId}/sous-titres/${sousTitreId}`);
              fetchClient(); // Refresh after delete
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le sous-titre');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorText}>Client non trouvé</Text>
        <Button title="Retour" onPress={() => navigation.goBack()} />
      </View>
    );
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

  // Get unités safely
  const unites = client.unites || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.clientNumberBadge}>
            <Text style={styles.clientNumber}>{client.clientNumber || 'N/A'}</Text>
          </View>
          {canEditClient(user?.role) && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ClientForm', { clientId })}
              >
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              {canDeleteClient(user?.role) && (
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
        <Text style={styles.clientName}>{client.name}</Text>
      </Card>

      {/* Contact Info */}
      <Card>
        <Text style={styles.sectionTitle}>📋 Informations de contact</Text>
        <InfoRow icon="📧" label="Email" value={client.email} />
        <InfoRow icon="📞" label="Téléphone" value={formatPhone(client.telephone)} />
        <InfoRow icon="📍" label="Adresse" value={client.address} />
        <InfoRow icon="🏛️" label="Département" value={client.departement} />
      </Card>

      {/* Financial Info */}
      <Card>
        <Text style={styles.sectionTitle}>💰 Informations financières</Text>
        <InfoRow icon="📊" label="TVA" value={`${client.tvaPercentage || 19}%`} />
        <InfoRow icon="💳" label="Mode de paiement" value={client.modePaiement} />
        <InfoRow icon="💵" label="Devise" value={client.devise || 'TND'} />
      </Card>

      {/* Unités Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleLarge}>
          🚤 Unités ({unites.length})
        </Text>
        {canCreateUnite(user?.role) && (
          <TouchableOpacity
            style={styles.addUniteButton}
            onPress={() => navigation.navigate('UniteForm', { clientId })}
          >
            <Text style={styles.addUniteText}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unités List */}
      {unites.length === 0 ? (
        <Card>
          <View style={styles.emptyUnites}>
            <Text style={styles.emptyEmoji}>🚢</Text>
            <Text style={styles.emptyText}>Aucune unité pour ce client</Text>
            {canCreateUnite(user?.role) && (
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => navigation.navigate('UniteForm', { clientId })}
              >
                <Text style={styles.addFirstText}>+ Ajouter la première unité</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      ) : (
        unites.map((unite, index) => (
          <Card key={unite._id || index} style={styles.uniteCard}>
            <View style={styles.uniteHeader}>
              <View style={styles.uniteInfo}>
                <View style={styles.uniteNumberBadge}>
                  <Text style={styles.uniteNumberText}>{unite.uniteNumber || 'N/A'}</Text>
                </View>
                <Text style={styles.uniteName}>{unite.uniteName || 'Sans nom'}</Text>
              </View>
              {canDeleteUnite(user?.role) && (
                <TouchableOpacity
                  onPress={() => handleDeleteUnite(unite._id, unite.uniteName)}
                  style={styles.deleteUniteButton}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Unite Details */}
            <View style={styles.uniteDetails}>
              {unite.responsable && (
                <View style={styles.uniteDetailRow}>
                  <Text style={styles.uniteDetailIcon}>👤</Text>
                  <Text style={styles.uniteDetailText}>{unite.responsable}</Text>
                </View>
              )}
              {unite.email && (
                <View style={styles.uniteDetailRow}>
                  <Text style={styles.uniteDetailIcon}>📧</Text>
                  <Text style={styles.uniteDetailText}>{unite.email}</Text>
                </View>
              )}
              {unite.phone && (
                <View style={styles.uniteDetailRow}>
                  <Text style={styles.uniteDetailIcon}>📞</Text>
                  <Text style={styles.uniteDetailText}>{unite.phone}</Text>
                </View>
              )}
            </View>

            {/* Sous-titres */}
            {unite.sousTitres && unite.sousTitres.length > 0 && (
              <View style={styles.sousTitresContainer}>
                <Text style={styles.sousTitresTitle}>
                  📍 Sous-titres ({unite.sousTitres.length}):
                </Text>
                {unite.sousTitres.map((st, stIndex) => (
                  <View key={st._id || stIndex} style={styles.sousTitreItem}>
                    <View style={styles.sousTitreInfo}>
                      <Text style={styles.sousTitreRef}>{st.refNumber || 'N/A'}</Text>
                      <Text style={styles.sousTitreName}>{st.name}</Text>
                    </View>
                    {canDeleteSousTitre(user?.role) && (
                      <TouchableOpacity
                        onPress={() => handleDeleteSousTitre(unite._id, st._id, st.name)}
                      >
                        <Text style={styles.deleteSousTitreIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Add Sous-titre Button */}
            {canCreateSousTitre(user?.role) && (
              <TouchableOpacity
                style={styles.addSousTitreButton}
                onPress={() => navigation.navigate('SousTitreForm', {
                  clientId,
                  uniteId: unite._id
                })}
              >
                <Text style={styles.addSousTitreText}>+ Ajouter sous-titre</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 24,
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
  clientNumberBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clientNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
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
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionTitleLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  addUniteButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addUniteText: {
    color: COLORS.white,
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
  // Debug styles
  // Empty state
  emptyUnites: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addFirstText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Unite card styles
  uniteCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  uniteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  uniteInfo: {
    flex: 1,
  },
  uniteNumberBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  uniteNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  uniteName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteUniteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  uniteDetails: {
    marginBottom: 12,
  },
  uniteDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  uniteDetailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  uniteDetailText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  sousTitresContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sousTitresTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  sousTitreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 6,
  },
  sousTitreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sousTitreRef: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  sousTitreName: {
    fontSize: 14,
    color: COLORS.text,
  },
  deleteSousTitreIcon: {
    fontSize: 16,
    color: COLORS.danger,
    padding: 4,
  },
  addSousTitreButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addSousTitreText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default ClientDetailScreen;