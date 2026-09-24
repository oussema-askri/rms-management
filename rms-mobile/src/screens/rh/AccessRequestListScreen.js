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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { LoadingSpinner, EmptyState } from '../../components/common';

const AccessRequestListScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      const response = await api.get('/rh/access-requests');
      let requestsData = [];
      if (Array.isArray(response.data)) {
        requestsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      }
      setRequests(requestsData);
      applyFilters(requestsData, searchQuery, activeFilter);
    } catch (error) {
      console.error('Error fetching access requests:', error);
      setRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const applyFilters = (data, search, status) => {
    let filtered = [...data];
    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.location?.toLowerCase().includes(s) ||
        r.purpose?.toLowerCase().includes(s) ||
        r.createdBy?.name?.toLowerCase().includes(s)
      );
    }
    setFilteredRequests(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(requests, query, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(requests, searchQuery, filter);
  };

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette demande d\'accès ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/rh/access-requests/${id}`);
            fetchRequests();
          } catch (e) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    const c = { approved: COLORS.success, rejected: COLORS.danger, pending: COLORS.warning };
    return c[status] || COLORS.warning;
  };

  const getStatusLabel = (status) => {
    const l = { approved: 'Approuvé', rejected: 'Rejeté', pending: 'En attente' };
    return l[status] || 'En attente';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  const FILTERS = [
    { key: 'all', label: `Tous (${requests.length})`, emoji: '📋' },
    { key: 'pending', label: `Attente (${pendingCount})`, emoji: '⏳' },
    { key: 'approved', label: `Approuvés (${approvedCount})`, emoji: '✅' },
    { key: 'rejected', label: 'Rejetés', emoji: '❌' },
  ];

  const renderRequest = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AccessRequestDetail', { requestId: item._id })}
      activeOpacity={0.75}
    >
      {/* Status left bar */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor(item.status) }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.location}>📍 {item.location}</Text>
            <Text style={styles.date}>📅 {formatDate(item.missionDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
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
          {item.materiels ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>🧰 Matériels:</Text>
              <Text style={styles.value} numberOfLines={2}>{item.materiels}</Text>
            </View>
          ) : null}
          {(item.vehicles?.length > 0) ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>🚗 Véhicule(s):</Text>
              <View style={styles.value}>
                {item.vehicles.map((v, i) => (
                  <Text key={i} style={styles.subValue}>
                    • {v.type} - {v.matricule}
                  </Text>
                ))}
              </View>
            </View>
          ) : (item.vehicle?.type) ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>🚗 Véhicule:</Text>
              <Text style={styles.value}>{item.vehicle.type} - {item.vehicle.matricule}</Text>
            </View>
          ) : null}
          {item.createdBy?.name && (
            <Text style={styles.createdBy}>Créé par {item.createdBy.name}</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('AccessRequestForm', { requestId: item._id })}
          >
            <Text style={styles.editBtnText}>✏️ Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
            <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {/* Search */}
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

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
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
            icon="🔑"
            title="Aucune demande d'accès"
            message="Créez une nouvelle demande pour commencer"
            actionLabel="Nouvelle demande"
            onAction={() => navigation.navigate('AccessRequestForm')}
          />
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { bottom: 90 }]} 
        onPress={() => navigation.navigate('AccessRequestForm')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
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

  filterScroll: { maxHeight: 44, marginBottom: 4 },
  filterContainer: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8F0FE',
    gap: 4,
  },
  filterChipActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  filterEmoji: { fontSize: 12 },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: COLORS.white },

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
  subValue: { fontSize: 13, color: '#1a2332', fontWeight: '500', marginBottom: 2 },
  createdBy: { fontSize: 11, color: COLORS.textLight, fontStyle: 'italic', marginTop: 4 },

  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4F2EE',
  },
  editBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  deleteBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  editBtnText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 13 },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  fab: {
    position: 'absolute', right: 16, bottom: 16,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  fabIcon: { fontSize: 28, color: COLORS.white, fontWeight: '300' },
});

export default AccessRequestListScreen;
