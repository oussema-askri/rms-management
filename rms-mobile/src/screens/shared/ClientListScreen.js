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
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { Card, LoadingSpinner, EmptyState } from '../../components/common';
import { canCreateClient } from '../../utils/permissions';
import { unwrapList } from '../../api/unwrap';

const ClientListScreen = ({ navigation }) => {
  const { user } = useAuth();
  // The empty-state button used to offer client creation to everyone while the
  // floating button was hidden from employers. Both follow the same rule now.
  const canCreate = canCreateClient(user?.role);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchClients = async () => {
  try {
    setError(null);
    
    const response = await api.get('/clients');
    
    
    const clientsData = unwrapList(response);

    
    setClients(clientsData);
    setFilteredClients(clientsData);
  } catch (error) {
    console.error('❌ Error:', error);
    setError(error.response?.data?.message || 'Erreur de connexion');
    setClients([]);
    setFilteredClients([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(query.toLowerCase()) ||
        client.clientNumber?.includes(query)
      );
      setFilteredClients(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>❌</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchClients}>
          <Text style={styles.retryText}>🔄 Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderClient = ({ item }) => (
    <Card
      onPress={() => navigation.navigate('ClientDetail', { clientId: item._id })}
      style={styles.clientCard}
    >
      <View style={styles.cardHeader}>
        <View style={styles.clientNumberBadge}>
          <Text style={styles.clientNumber}>{item.clientNumber || 'N/A'}</Text>
        </View>
        <View style={styles.uniteBadge}>
          <Text style={styles.uniteCount}>
            {item.unites?.length || 0} unités
          </Text>
        </View>
      </View>
      <Text style={styles.clientName}>{item.name}</Text>
      {item.email && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📧</Text>
          <Text style={styles.infoText}>{item.email}</Text>
        </View>
      )}
      {item.telephone && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📞</Text>
          <Text style={styles.infoText}>{item.telephone}</Text>
        </View>
      )}
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>💳</Text>
        <Text style={styles.infoText}>{item.modePaiement || 'N/A'} • {item.devise || 'TND'}</Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
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

      {/* Result count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          📊 {filteredClients.length} client(s) trouvé(s)
        </Text>
      </View>

      {/* Client List */}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item, index) => item._id?.toString() || String(index)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="Aucun client"
            message="Commencez par ajouter votre premier client"
            actionLabel={canCreate ? 'Ajouter un client' : undefined}
            onAction={canCreate ? () => navigation.navigate('ClientForm') : undefined}
          />
        }
      />

      {/* FAB (Admin/RH/Responsable/Comptable only) */}
      {canCreate && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 90 }]}
          onPress={() => navigation.navigate('ClientForm')}
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
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  clearIcon: {
    fontSize: 18,
    color: COLORS.textLight,
    padding: 4,
  },
  countBar: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  clientCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientNumberBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clientNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  uniteBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  uniteCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    marginTop: -2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.background,
  },
  errorEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClientListScreen;