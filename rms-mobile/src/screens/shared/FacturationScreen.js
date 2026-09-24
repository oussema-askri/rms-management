import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/config';

export default function FacturationScreen({ navigation }) {
  const { user } = useAuth();
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchFactures();
  }, []));

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/facturation');
      setFactures(res.data?.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de récupérer l\'historique des factures.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (factureId) => {
    Alert.alert(
      'Supprimer Facture',
      'Êtes-vous sûr de vouloir supprimer cette facture ? Les bons de réception liés seront débloqués.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/facturation/${factureId}`);
              fetchFactures();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer la facture.');
            }
          }
        }
      ]
    );
  };

  const triggerDownload = async (factureId, factureNumber) => {
    try {
      const dlResponse = await api.get(`/facturation/${factureId}/download`, { responseType: 'arraybuffer' });
      
      let binary = '';
      const bytes = new Uint8Array(dlResponse.data);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const filename = `Facture-${(factureNumber||'').replace(/[^a-zA-Z0-9-_]/g, '_')}.docx`;
      const fileUri = FileSystem.cacheDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: 'base64',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: `Facture ${factureNumber}`,
        });
      } else {
        Alert.alert('Succès', `Fichier sauvegardé: ${filename}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de télécharger la facture.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des factures...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Historique Facturation</Text>
        <Text style={styles.headerSub}>Gérez les factures générées et créez-en de nouvelles.</Text>
      </View>

      <FlatList
        data={factures}
        keyExtractor={f => f._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.factCard}>
            <View style={styles.factTop}>
              <View style={styles.factBadge}>
                <Text style={styles.factBadgeText}>{item.factureNumber}</Text>
              </View>
              <Text style={styles.factDate}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
            </View>
            <View style={styles.factBody}>
              <Text style={styles.factClient}>{item.clientName || 'Client inconnu'}</Text>
              <Text style={styles.factBons}>{item.bons?.length || 0} bon(s) rattaché(s)</Text>
            </View>
            <View style={styles.factBottom}>
              <Text style={styles.factTotal}>{(item.totalHT || 0).toFixed(3)} TND</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.btnAction}
                  onPress={() => triggerDownload(item._id, item.factureNumber)}
                >
                  <MaterialIcons name="file-download" size={20} color="#003664" />
                </TouchableOpacity>

                {user?.role === 'admin' && (
                  <TouchableOpacity 
                    style={[styles.btnAction, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDelete(item._id)}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centerEmpty}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucune facture générée pour le moment.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('FacturationForm')}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontSize: 14 },
  emptyText: { color: COLORS.textLight, fontSize: 15, textAlign: 'center', marginTop: 16 },

  headerBox: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#003664' },
  headerSub: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },

  listContent: { padding: 16, paddingBottom: 24 },
  factCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  factTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  factBadge: { backgroundColor: '#e6edf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  factBadgeText: { color: '#003664', fontWeight: '700', fontSize: 13 },
  factDate: { color: COLORS.textLight, fontSize: 12 },

  factBody: { marginBottom: 16 },
  factClient: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  factBons: { fontSize: 13, color: COLORS.textLight },

  factBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 12 },
  factTotal: { fontSize: 18, fontWeight: '800', color: '#785A00' },
  
  btnAction: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#785A00',
    backgroundColor: '#FDFBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    backgroundColor: '#003664',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});
