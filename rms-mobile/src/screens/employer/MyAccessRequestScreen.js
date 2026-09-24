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
import * as Sharing from 'expo-sharing';
import api from '../../api/axios';
import { downloadStoredFile } from '../../api/files';
import { COLORS } from '../../constants/config';
import { LoadingSpinner, EmptyState } from '../../components/common';

const MyAccessRequestScreen = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/rh/my-access-requests');
      const data = response.data?.data || [];
      setRequests(data);
      applySearch(data, searchQuery);
    } catch (error) {
      console.error('Error fetching my access requests:', error);
      setRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const applySearch = (data, query) => {
    if (!query.trim()) { setFilteredRequests(data); return; }
    const s = query.toLowerCase();
    setFilteredRequests(data.filter(r =>
      r.location?.toLowerCase().includes(s) ||
      r.purpose?.toLowerCase().includes(s) ||
      r.createdBy?.name?.toLowerCase().includes(s)
    ));
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applySearch(requests, query);
  };

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const downloadDocument = async (item) => {
    if (!item.docxPath) {
      Alert.alert('Information', 'Aucun document disponible pour cette demande');
      return;
    }
    try {
      setDownloadingId(item._id);
      // /uploads requires a session now, so the token has to travel with the
      // download. The old URL builder also broke on hosts containing "api".
      const uri = await downloadStoredFile(item.docxPath, `demande-acces-${item._id}.docx`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Succès', 'Document téléchargé');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger le document');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const renderRequest = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.statusBar, { backgroundColor: COLORS.success }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.location}>📍 {item.location}</Text>
            <Text style={styles.date}>📅 {formatDate(item.missionDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
            <Text style={[styles.statusText, { color: COLORS.success }]}>
              Approuvé
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {item.purpose ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>🎯 Objet:</Text>
              <Text style={styles.value} numberOfLines={2}>{item.purpose}</Text>
            </View>
          ) : null}
          {item.duration ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>⏱️ Durée:</Text>
              <Text style={styles.value}>{item.duration}</Text>
            </View>
          ) : null}
          {item.workers?.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>👷 Personnel:</Text>
              <Text style={styles.value}>{item.workers.length} personne(s)</Text>
            </View>
          )}
          {item.vehicle?.type && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>🚗 Véhicule:</Text>
              <Text style={styles.value}>{item.vehicle.type} - {item.vehicle.matricule}</Text>
            </View>
          )}
          {item.createdBy?.name && (
            <Text style={styles.createdBy}>Créé par {item.createdBy.name}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => downloadDocument(item)}
            disabled={downloadingId === item._id}
          >
            <Text style={styles.downloadBtnText}>
              {downloadingId === item._id ? '⏳ Téléchargement...' : '📥 Télécharger Document'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par lieu, objet..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={COLORS.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filteredRequests.length} demande(s)</Text>
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="🎫"
            title="Aucune demande d'accès"
            message="Aucune demande approuvée vous concernant"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8F0FE',
    shadowColor: '#1E4D80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 17, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  clearIcon: { fontSize: 16, color: COLORS.textLight, padding: 4 },

  countBar: { paddingHorizontal: 14, paddingVertical: 6 },
  countText: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },

  listContent: { padding: 12, paddingTop: 4, paddingBottom: 24 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#1E4D80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  statusBar: { width: 4, borderRadius: 0 },
  cardInner: { flex: 1, padding: 14 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F2EE',
  },
  headerLeft: { flex: 1, marginRight: 8 },
  location: { fontSize: 16, fontWeight: '700', color: '#1a2332', marginBottom: 3 },
  date: { fontSize: 13, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  cardBody: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, width: 100 },
  value: { flex: 1, fontSize: 13, color: '#1a2332', fontWeight: '500' },
  createdBy: { fontSize: 11, color: COLORS.textLight, fontStyle: 'italic', marginTop: 4 },

  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F2EE',
  },
  downloadBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  downloadBtnText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 13 },
});

export default MyAccessRequestScreen;
