import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useTabBarScroll } from '../../navigation/TabNavigator';
import { useAuth } from '../../context/AuthContext';
import { canDeletePointage } from '../../utils/permissions';

const STATUS_COLORS = {
  present: { color: '#27976A', bg: '#E8F4EE', label: 'Présent' },
  late: { color: '#C26B1E', bg: '#FAF0E6', label: 'Retard' },
  absent: { color: '#B53535', bg: '#FFDAD6', label: 'Absent' },
};

export default function PointageListScreen({ navigation }) {
  const { handleScroll } = useTabBarScroll();
  const { user } = useAuth();
  // DELETE /pointage/:id is admin only. The button was shown to rh as well,
  // whose taps always came back 403.
  const canDelete = canDeletePointage(user?.role);
  const [pointages, setPointages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedId, setSelectedId] = useState(null);

  useFocusEffect(useCallback(() => {
    fetchPointages();
  }, [month]));

  const fetchPointages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pointage/all', { params: { month } });
      setPointages(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (dir) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer ce pointage ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/pointage/${id}`);
            setPointages(prev => prev.filter(p => p._id !== id));
            if (selectedId === id) setSelectedId(null);
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        }
      }
    ]);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short'
  });

  const monthLabel = (() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  })();

  const selected = selectedId ? pointages.find(p => p._id === selectedId) : null;

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Detail View */}
      {selected ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
            <MaterialIcons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.detailHeader}>
            <Text style={styles.detailDate}>{formatDate(selected.date)}</Text>
            <Text style={styles.detailBy}>
              Par: {selected.createdBy?.name || selected.createdByName}
            </Text>
          </View>

          {selected.entries?.map((entry, idx) => (
            <View key={idx} style={[styles.detailEntry, { borderLeftColor: STATUS_COLORS[entry.status]?.color || '#ccc' }]}>
              <View style={styles.detailEntryHeader}>
                <Text style={styles.detailEntryName}>{entry.workerName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[entry.status]?.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[entry.status]?.color }]}>
                    {STATUS_COLORS[entry.status]?.label || entry.status}
                  </Text>
                </View>
              </View>
              {entry.status === 'absent' && entry.absentReason ? (
                <Text style={styles.detailMeta}>Raison: {entry.absentReason}</Text>
              ) : null}
              {entry.clientName ? <Text style={styles.detailMeta}>Client: {entry.clientName}</Text> : null}
              {entry.unite ? <Text style={styles.detailMeta}>Unité: {entry.unite}</Text> : null}
              {entry.notes ? <Text style={styles.detailMeta}>Notes: {entry.notes}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        /* List View */
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPointages} />}
        >
          {loading && pointages.length === 0 && (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          )}

          {!loading && pointages.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucun pointage ce mois</Text>
            </View>
          )}

          {pointages.map(p => {
            const pr = p.entries?.filter(e => e.status === 'present').length || 0;
            const ab = p.entries?.filter(e => e.status === 'absent').length || 0;
            const lt = p.entries?.filter(e => e.status === 'late').length || 0;
            return (
              <TouchableOpacity key={p._id} style={styles.listCard} onPress={() => setSelectedId(p._id)}>
                <View style={styles.listCardLeft}>
                  <Text style={styles.listDate}>{formatDate(p.date)}</Text>
                  <Text style={styles.listBy}>{p.createdBy?.name || p.createdByName}</Text>
                </View>
                <View style={styles.listCardCenter}>
                  <View style={styles.countRow}>
                    <Text style={[styles.countNum, { color: '#27976A' }]}>{pr}</Text>
                    <Text style={styles.countLbl}>Pr</Text>
                    <Text style={[styles.countNum, { color: '#C26B1E' }]}>{lt}</Text>
                    <Text style={styles.countLbl}>Ret</Text>
                    <Text style={[styles.countNum, { color: '#B53535' }]}>{ab}</Text>
                    <Text style={styles.countLbl}>Abs</Text>
                  </View>
                </View>
                <View style={styles.listCardRight}>
                  {canDelete && (
                    <TouchableOpacity onPress={() => handleDelete(p._id)} style={{ padding: 4 }}>
                      <MaterialIcons name="delete-outline" size={20} color="#B53535" />
                    </TouchableOpacity>
                  )}
                  <MaterialIcons name="chevron-right" size={22} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailHeader: {
    marginBottom: 16,
  },
  detailDate: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  detailBy: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  detailEntry: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  detailEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailEntryName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  listCardLeft: {
    flex: 1,
  },
  listDate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  listBy: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  listCardCenter: {
    flex: 1,
    alignItems: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  countLbl: {
    fontSize: 10,
    color: COLORS.textLight,
    marginRight: 6,
  },
  listCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
