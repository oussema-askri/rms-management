import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';

const statusColor = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};
const statusLabel = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

export default function CongeManagementScreen() {
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState({});

  const fetchConges = useCallback(async () => {
    try {
      const res = await api.get('/rh/conge');
      setConges(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchConges(); }, [fetchConges]);

  const handleStatus = async (id, status) => {
    const label = status === 'approved' ? 'approuver' : 'rejeter';
    Alert.alert('Confirmation', `Voulez-vous ${label} cette demande ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer', onPress: async () => {
          try {
            await api.patch(`/rh/conge/${id}/status`, {
              status,
              rhComment: comments[id] || '',
            });
            fetchConges();
          } catch (e) {
            Alert.alert('Erreur', e.response?.data?.message || 'Erreur');
          }
        }
      }
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/rh/conge/${id}`);
            setConges(prev => prev.filter(c => c._id !== id));
          } catch (e) {
            Alert.alert('Erreur', e.response?.data?.message || 'Erreur');
          }
        }
      }
    ]);
  };

  const calcDays = (s, e) =>
    Math.ceil((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24)) + 1;

  const filtered = conges.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.employeeName?.toLowerCase().includes(s) ||
      c.reason?.toLowerCase().includes(s)
    );
  });

  const count = (status) => conges.filter(c => c.status === status).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{conges.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: '#F59E0B' }]}>
          <Text style={[styles.statVal, { color: '#F59E0B' }]}>{count('pending')}</Text>
          <Text style={styles.statLbl}>En attente</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: '#10B981' }]}>
          <Text style={[styles.statVal, { color: '#10B981' }]}>{count('approved')}</Text>
          <Text style={styles.statLbl}>Approuvées</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: '#EF4444' }]}>
          <Text style={[styles.statVal, { color: '#EF4444' }]}>{count('rejected')}</Text>
          <Text style={styles.statLbl}>Rejetées</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par employé, raison..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConges(); }} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune demande de congé</Text>
          </View>
        ) : (
          filtered.map(c => {
            const days = calcDays(c.startDate, c.endDate);
            return (
              <View key={c._id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.empName}>{c.employeeName}</Text>
                    <Text style={styles.empSub}>{c.employee?.cin || ''}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusColor[c.status] + '22' }]}>
                    <Text style={[styles.badgeText, { color: statusColor[c.status] }]}>
                      {statusLabel[c.status]}
                    </Text>
                  </View>
                </View>

                {/* Dates + days */}
                <View style={styles.datesRow}>
                  <Text style={styles.datesText}>
                    📅 {new Date(c.startDate).toLocaleDateString('fr-FR')} → {new Date(c.endDate).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.daysChip}>{days}j</Text>
                </View>

                {/* Reason */}
                <Text style={styles.reasonText}>{c.reason}</Text>

                {/* RH Comment */}
                <TextInput
                  style={styles.commentInput}
                  placeholder="Commentaire RH..."
                  value={comments[c._id] !== undefined ? comments[c._id] : (c.rhComment || '')}
                  onChangeText={v => setComments(prev => ({ ...prev, [c._id]: v }))}
                />

                {/* Actions */}
                <View style={styles.actions}>
                  {c.status !== 'approved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleStatus(c._id, 'approved')}
                    >
                      <Text style={styles.approveBtnText}>✓ Approuver</Text>
                    </TouchableOpacity>
                  )}
                  {c.status !== 'rejected' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleStatus(c._id, 'rejected')}
                    >
                      <Text style={styles.rejectBtnText}>✗ Rejeter</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(c._id)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryDark,
    paddingLeft: 8,
  },
  statVal: { fontSize: 18, fontWeight: '700', color: COLORS.primaryDark },
  statLbl: { fontSize: 11, color: '#6B7280' },

  searchWrap: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },

  scroll: { padding: 12, paddingBottom: 32 },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { color: '#9CA3AF', fontSize: 15 },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  empName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  empSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  datesText: { fontSize: 13, color: '#374151' },
  daysChip: {
    backgroundColor: COLORS.primaryDark + '18',
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  reasonText: { fontSize: 14, color: '#6B7280', marginBottom: 10 },

  commentInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },

  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtn: { backgroundColor: '#D1FAE5' },
  approveBtnText: { color: '#065F46', fontWeight: '600', fontSize: 13 },
  rejectBtn: { backgroundColor: '#FEE2E2' },
  rejectBtnText: { color: '#991B1B', fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#F3F4F6' },
  deleteBtnText: { fontSize: 16 },
});
