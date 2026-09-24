import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Card, LoadingSpinner, EmptyState, StatusBadge } from '../../components/common';
import { formatDate } from '../../utils/formatters';

const BonListScreen = ({ navigation }) => {
  const [bons, setBons] = useState([]);
  const [filteredBons, setFilteredBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchBons = async () => {
    try {
      const response = await api.get('/bon-de-reception');
      
      let bonsData = [];
      if (Array.isArray(response.data)) {
        bonsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        bonsData = response.data.data;
      }
      
      setBons(bonsData);
      applyFilters(bonsData, searchQuery, activeFilter);
    } catch (error) {
      console.error('❌ Error fetching bons:', error);
      setBons([]);
      setFilteredBons([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBons();
    }, [])
  );

  const applyFilters = (data, search, status) => {
    if (!Array.isArray(data)) {
      setFilteredBons([]);
      return;
    }

    let filtered = [...data];

    // Apply status filter
    if (status && status !== 'all') {
      filtered = filtered.filter(b => b && b.status === status);
    }

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b => {
        if (!b) return false;
        return (
          (b.clientName && b.clientName.toLowerCase().includes(searchLower)) ||
          (b.bonNumber && b.bonNumber.toLowerCase().includes(searchLower)) ||
          (b.unite && b.unite.toLowerCase().includes(searchLower))
        );
      });
    }

    setFilteredBons(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query || '');
    applyFilters(bons, query || '', activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter || 'all');
    applyFilters(bons, searchQuery, filter || 'all');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBons();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const FilterButton = ({ label, value, emoji }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(value)}
    >
      <Text style={styles.filterEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.filterText,
          activeFilter === value && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBon = ({ item }) => {
    if (!item) return null;

    const tasksCount = item.taches?.length || 0;

    return (
      <Card
        onPress={() => navigation.navigate('BonDetail', { bonId: item._id })}
        style={styles.bonCard}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.bonNumberBadge}>
            <Text style={styles.bonNumber}>{item.bonNumber || 'N/A'}</Text>
          </View>
          <StatusBadge status={item.status || 'active'} />
        </View>

        {/* Client Info */}
        <Text style={styles.clientName}>{item.clientName || 'N/A'}</Text>
        <Text style={styles.uniteName}>
          {item.unite || 'N/A'} ({item.uniteNumber || ''})
        </Text>

        {/* Tasks Count */}
        <View style={styles.tasksContainer}>
          <Text style={styles.tasksIcon}>📋</Text>
          <Text style={styles.tasksText}>
            {tasksCount} tâche(s) {item.status === 'signed' ? 'validée(s)' : 'en attente'}
          </Text>
        </View>

        {/* Signed Info */}
        {item.status === 'signed' && item.signedAt && (
          <View style={styles.signedInfo}>
            <Text style={styles.signedIcon}>✅</Text>
            <Text style={styles.signedText}>
              Signé le {formatDate(item.signedAt)}
              {item.signedBy?.name && ` par ${item.signedBy.name}`}
            </Text>
          </View>
        )}

        {/* Status Line */}
        <View
          style={[
            styles.statusLine,
            { backgroundColor: item.status === 'signed' ? COLORS.success : COLORS.primary },
          ]}
        />
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
          placeholder="Rechercher par client, numéro..."
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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton label="Tous" value="all" emoji="📄" />
        <FilterButton label="Actifs" value="active" emoji="📝" />
        <FilterButton label="Signés" value="signed" emoji="✅" />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredBons.length} bon(s) de réception
        </Text>
      </View>

      {/* Bons List */}
      <FlatList
        data={filteredBons}
        renderItem={renderBon}
        keyExtractor={(item, index) => item?._id?.toString() || index.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="Aucun bon de réception"
            message="Les bons sont créés automatiquement lorsqu'une tâche est terminée"
          />
        }
      />
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
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  clearIcon: {
    fontSize: 18,
    color: COLORS.textLight,
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  statsBar: {
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
  bonCard: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bonNumberBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bonNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  uniteName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
    marginBottom: 10,
  },
  tasksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tasksIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tasksText: {
    fontSize: 14,
    color: COLORS.text,
  },
  signedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.success + '15',
    padding: 8,
    borderRadius: 8,
  },
  signedIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  signedText: {
    fontSize: 12,
    color: COLORS.success,
  },
  statusLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});

export default BonListScreen;