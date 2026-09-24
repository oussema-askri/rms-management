import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { useTabBarScroll } from '../../navigation/TabNavigator';
import { formatDateForInput } from '../../utils/formatters';

const STATUS_CONFIG = {
  present: { label: 'P', color: '#27976A', bg: '#E8F4EE', fullLabel: 'Présent' },
  late: { label: 'R', color: '#C26B1E', bg: '#FAF0E6', fullLabel: 'Retard' },
  absent: { label: 'A', color: '#B53535', bg: '#FFDAD6', fullLabel: 'Absent' },
};

export default function PointageFormScreen({ navigation }) {
  const { handleScroll } = useTabBarScroll();
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [entries, setEntries] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/pointage/employees').then(res => setAllEmployees(res.data.data || [])).catch(e => console.error('Failed to load employees:', e));
  }, []);

  useFocusEffect(useCallback(() => {
    loadDateData();
  }, [date]));

  const loadDateData = async () => {
    setLoading(true);
    setSaved(false);
    setMessage(null);
    try {
      const myRes = await api.get(`/pointage/my?date=${date}`);
      if (myRes.data.data) {
        setEntries(myRes.data.data.entries);
        setSaved(true);
        setLoading(false);
        return;
      }

      const planRes = await api.get(`/pointage/planning-for-date?date=${date}`);
      const plannings = planRes.data.data || [];
      const newEntries = [];
      const seen = new Set();

      plannings.forEach(p => {
        (p.assignedWorkers || []).forEach(w => {
          if (!seen.has(w._id)) {
            seen.add(w._id);
            newEntries.push({
              worker: w._id,
              workerName: w.name,
              status: 'present',
              absentReason: '',
              clientName: p.client?.name || p.clientName || '',
              unite: p.unite || '',
              planning: p._id,
              notes: '',
            });
          }
        });
      });
      setEntries(newEntries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get(`/pointage/duplicate?date=${date}`);
      if (res.data.data?.entries?.length > 0) {
        const duplicated = res.data.data.entries.map(e => ({
          worker: e.worker,
          workerName: e.workerName,
          status: 'present',
          absentReason: '',
          clientName: e.clientName || '',
          unite: e.unite || '',
          planning: null,
          notes: '',
        }));
        setEntries(duplicated);
        setSaved(false);
        const prevDate = new Date(res.data.data.date).toLocaleDateString('fr-FR');
        setMessage({ type: 'info', text: `Dupliqué depuis ${prevDate}` });
      } else {
        setMessage({ type: 'warning', text: 'Aucun pointage précédent trouvé' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la duplication' });
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(formatDateForInput(d));
  };

  const updateEntry = (index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'status' && value === 'present') {
        updated[index].absentReason = '';
      }
      return updated;
    });
    setSaved(false);
  };

  const removeEntry = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const addWorker = (emp) => {
    if (entries.find(e => e.worker === emp._id)) {
      Alert.alert('Info', 'Cet employé est déjà dans la liste');
      return;
    }
    setEntries(prev => [...prev, {
      worker: emp._id,
      workerName: emp.name,
      status: 'present',
      absentReason: '',
      clientName: '',
      unite: '',
      planning: null,
      notes: '',
    }]);
    setShowAddWorker(false);
    setSaved(false);
  };

  const handleSave = async () => {
    if (entries.length === 0) {
      Alert.alert('Attention', 'Ajoutez au moins un employé');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/pointage', { date, entries });
      setSaved(true);
      setMessage({ type: 'success', text: 'Pointage enregistré!' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const availableEmployees = allEmployees.filter(emp => !entries.find(e => e.worker === emp._id));

  const counts = {
    present: entries.filter(e => e.status === 'present').length,
    absent: entries.filter(e => e.status === 'absent').length,
    late: entries.filter(e => e.status === 'late').length,
  };

  const formatDisplayDate = (d) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const msgColors = {
    success: { bg: '#E8F4EE', text: '#165A3D' },
    error: { bg: '#FFDAD6', text: '#6E1E1E' },
    warning: { bg: '#FAF0E6', text: '#773F11' },
    info: { bg: '#EEF2F8', text: '#163C66' },
  };

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnDuplicate} onPress={handleDuplicate} disabled={loading}>
          <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
          <Text style={styles.btnDuplicateText}>Dupliquer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAdd} onPress={() => setShowAddWorker(!showAddWorker)}>
          <MaterialIcons name="person-add" size={16} color="#fff" />
          <Text style={styles.btnAddText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Message */}
      {message && (
        <View style={[styles.messageBox, { backgroundColor: msgColors[message.type]?.bg }]}>
          <Text style={{ color: msgColors[message.type]?.text, fontSize: 13, fontWeight: '500' }}>
            {message.text}
          </Text>
        </View>
      )}

      {/* Stats */}
      {entries.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{entries.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#E8F4EE' }]}>
            <Text style={[styles.statNum, { color: '#27976A' }]}>{counts.present}</Text>
            <Text style={styles.statLbl}>Pr.</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#FAF0E6' }]}>
            <Text style={[styles.statNum, { color: '#C26B1E' }]}>{counts.late}</Text>
            <Text style={styles.statLbl}>Ret.</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#FFDAD6' }]}>
            <Text style={[styles.statNum, { color: '#B53535' }]}>{counts.absent}</Text>
            <Text style={styles.statLbl}>Abs.</Text>
          </View>
        </View>
      )}

      {/* Add Worker List */}
      {showAddWorker && (
        <View style={styles.addWorkerBox}>
          <Text style={styles.addWorkerTitle}>Sélectionner un employé</Text>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {availableEmployees.length === 0 ? (
              <Text style={styles.noEmp}>Tous les employés sont déjà ajoutés</Text>
            ) : (
              availableEmployees.map(emp => (
                <TouchableOpacity key={emp._id} style={styles.empOption} onPress={() => addWorker(emp)}>
                  <Text style={styles.empName}>{emp.name}</Text>
                  <Text style={styles.empType}>{emp.employeeType || emp.role}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Entries */}
      <ScrollView
        style={styles.entriesScroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDateData} />}
      >
        {loading && entries.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        )}

        {!loading && entries.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="how-to-reg" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun employé planifié pour cette date</Text>
            <Text style={styles.emptySubtext}>Utilisez "Ajouter" ou "Dupliquer"</Text>
          </View>
        )}

        {entries.map((entry, idx) => (
          <View key={entry.worker + '-' + idx} style={[
            styles.entryCard,
            entry.status === 'absent' && { borderLeftColor: '#B53535' },
            entry.status === 'late' && { borderLeftColor: '#C26B1E' },
            entry.status === 'present' && { borderLeftColor: '#27976A' },
          ]}>
            {/* Header: name + remove */}
            <View style={styles.entryHeader}>
              <Text style={styles.entryName}>{entry.workerName}</Text>
              <TouchableOpacity onPress={() => removeEntry(idx)} style={styles.btnRemove}>
                <MaterialIcons name="close" size={18} color="#B53535" />
              </TouchableOpacity>
            </View>

            {/* Status toggles */}
            <View style={styles.statusRow}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusBtn,
                    entry.status === key && { backgroundColor: cfg.color, borderColor: cfg.color }
                  ]}
                  onPress={() => updateEntry(idx, 'status', key)}
                >
                  <Text style={[
                    styles.statusBtnText,
                    entry.status === key && { color: '#fff' }
                  ]}>{cfg.fullLabel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Absent reason */}
            {entry.status === 'absent' && (
              <TextInput
                style={styles.input}
                placeholder="Raison d'absence"
                placeholderTextColor={COLORS.textLight}
                value={entry.absentReason}
                onChangeText={v => updateEntry(idx, 'absentReason', v)}
              />
            )}

            {/* Client & Unite */}
            <View style={styles.fieldRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Client"
                placeholderTextColor={COLORS.textLight}
                value={entry.clientName}
                onChangeText={v => updateEntry(idx, 'clientName', v)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Unité"
                placeholderTextColor={COLORS.textLight}
                value={entry.unite}
                onChangeText={v => updateEntry(idx, 'unite', v)}
              />
            </View>

            {/* Notes */}
            <TextInput
              style={styles.input}
              placeholder="Notes"
              placeholderTextColor={COLORS.textLight}
              value={entry.notes}
              onChangeText={v => updateEntry(idx, 'notes', v)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Save Button */}
      {entries.length > 0 && (
        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saved && { backgroundColor: '#27976A' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name={saved ? 'check-circle' : 'save'} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {saved ? 'Enregistré' : 'Enregistrer'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dateArrow: {
    padding: 8,
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnDuplicate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  btnDuplicateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  btnAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  messageBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statNum: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  addWorkerBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addWorkerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  noEmp: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  empOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    marginBottom: 6,
  },
  empName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  empType: {
    fontSize: 11,
    color: COLORS.textLight,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entriesScroll: {
    flex: 1,
    paddingHorizontal: 16,
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
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textDisabled,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#27976A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  btnRemove: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(245,243,239,0.95)',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
