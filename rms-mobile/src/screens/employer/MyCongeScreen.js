import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, Platform, KeyboardAvoidingView,
  ActivityIndicator, TextInput, Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { formatDateForInput } from '../../utils/formatters';

const ANNUAL_DAYS = 18;
const statusColor = { pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444' };
const statusLabel = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
// Local calendar day. toISOString() returned the previous day for any
// date picked at local midnight in a UTC+ timezone.
const toISO = formatDateForInput;

export default function MyCongeScreen() {
  const insets = useSafeAreaInsets();
  const [conges, setConges] = useState([]);
  const [solde, setSolde] = useState(ANNUAL_DAYS);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Stats
  const [takenDays, setTakenDays] = useState(0);
  const [pendingDays, setPendingDays] = useState(0);

  // Date picker state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState(null); 
  const [showStartPicker, setShowStartPicker] = useState(false); 
  const [showEndPicker, setShowEndPicker] = useState(false);   

  const [reason, setReason] = useState('');
  const [pieceJointe, setPieceJointe] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const calcDays = (s, e) => {
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const fetchConges = useCallback(async () => {
    try {
      const res = await api.get('/rh/my-conge');
      const data = res.data.data || [];
      setConges(data);
      setSolde(res.data.solde ?? ANNUAL_DAYS);

      let tDays = 0, pDays = 0;
      data.forEach(c => {
        const d = calcDays(new Date(c.startDate), new Date(c.endDate));
        if (c.status === 'approved') tDays += d;
        if (c.status === 'pending') pDays += d;
      });
      setTakenDays(tDays);
      setPendingDays(pDays);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConges(); }, [fetchConges]);

  const openPicker = (target) => setPickerTarget(target);

  const onAndroidChange = (event, selected) => {
    setPickerTarget(null);
    if (event.type === 'dismissed' || !selected) return;
    if (pickerTarget === 'start') {
      setStartDate(selected);
      if (selected > endDate) setEndDate(selected);
    } else {
      setEndDate(selected);
    }
  };

  const onIOSStartChange = (_, selected) => {
    if (selected) {
      setStartDate(selected);
      if (selected > endDate) setEndDate(selected);
    }
  };

  const onIOSEndChange = (_, selected) => { if (selected) setEndDate(selected); };

  const handlePieceJointe = () => {
    Alert.alert('Pièce jointe', 'Choisissez une source:', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Galerie Image', onPress: pickImage },
      { text: 'Caméra', onPress: takePhoto },
      { text: 'Fichier (PDF)', onPress: pickDocument },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission', 'Accès galerie requis');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPieceJointe({ uri: a.uri, name: a.fileName || 'image.jpg', mimeType: 'image/jpeg' });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission', 'Caméra requise');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPieceJointe({ uri: a.uri, name: a.fileName || 'photo.jpg', mimeType: 'image/jpeg' });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) setPieceJointe(result.assets[0]);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const resetForm = () => {
    setStartDate(new Date()); setEndDate(new Date()); setReason(''); setPieceJointe(null);
    setShowStartPicker(false); setShowEndPicker(false); setPickerTarget(null);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) return Alert.alert('Champ manquant', 'Veuillez saisir la raison');
    if (endDate < startDate) return Alert.alert('Dates invalides', 'La date de fin doit être après la date de début');
    
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('startDate', toISO(startDate));
      fd.append('endDate', toISO(endDate));
      fd.append('reason', reason);
      if (pieceJointe) {
        fd.append('pieceJointe', {
          uri: pieceJointe.uri, 
          name: pieceJointe.name, 
          type: pieceJointe.mimeType || 'application/octet-stream',
        });
      }
      await api.post('/rh/conge', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      resetForm();
      fetchConges();
      Alert.alert('Succès', 'Demande de congé soumise');
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try { await api.delete(`/rh/conge/${id}`); fetchConges(); } 
          catch (e) { Alert.alert('Erreur', e.response?.data?.message || 'Erreur'); }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
        <Text style={{ marginTop: 12, color: COLORS.primaryDark }}>Chargement des congés...</Text>
      </View>
    );
  }

  // Generate simple mock month visualizer for "Planning de Juin 2024" (using current month)
  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const mockDays = Array.from({length: 14}, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.subtitle}>SUIVI DES ABSENCES</Text>
          <Text style={styles.headerTitle}>Mes Congés</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Visualizer Solde */}
        <View style={styles.soldeCard}>
          <Text style={styles.soldeCardTitle}>Solde Annuel</Text>
          <View style={styles.ringContainer}>
            <View style={styles.circleOuter}>
               <View style={styles.circleInner}>
                  <Text style={styles.circleValueText}>{solde}</Text>
                  <View style={styles.circleDivider} />
                  <Text style={styles.circleSubText}>Sur {ANNUAL_DAYS} jours acquis</Text>
               </View>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>En attente</Text>
              <Text style={styles.statValPending}>{pendingDays} j</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pris</Text>
              <Text style={styles.statValApproved}>{takenDays} j</Text>
            </View>
          </View>
        </View>

        {/* Small Visual Calendar Box */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
              <MaterialIcons name="event" size={20} color={COLORS.secondary} />
              <Text style={styles.calendarHeaderTitle}>Planning de {currentMonth}</Text>
            </View>
          </View>
          <View style={styles.calGrid}>
            <View style={styles.calRow}>
              {['L','M','M','J','V','S','D'].map((d,i) => <Text key={i} style={styles.calDayName}>{d}</Text>)}
            </View>
            <View style={styles.calDaysArray}>
              {mockDays.map(d => (
                 <Text key={d} style={styles.calDayNum}>{d}</Text>
              ))}
            </View>
          </View>
          <View style={styles.calLegend}>
            <View style={styles.calLegendItem}>
              <View style={[styles.legendDot, {backgroundColor: COLORS.secondary}]} />
              <Text style={styles.legendText}>Approuvés</Text>
            </View>
            <View style={styles.calLegendItem}>
              <View style={[styles.legendDot, {backgroundColor: COLORS.primaryDark}]} />
              <Text style={styles.legendText}>Aujourd'hui</Text>
            </View>
          </View>
        </View>

        {/* Historique */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Historique des Demandes</Text>
          
          {conges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune demande enregistrée.</Text>
            </View>
          ) : (
            conges.map(c => {
               const d = calcDays(new Date(c.startDate), new Date(c.endDate));
               const isApp = c.status === 'approved';
               return (
                 <View key={c._id} style={styles.card}>
                   <View style={styles.cardLeft}>
                     <View style={[styles.cardIconBox, { backgroundColor: isApp ? COLORS.secondary + '1A' : COLORS.primaryDark + '1A' }]}>
                       <MaterialIcons name="beach-access" size={24} color={isApp ? COLORS.secondary : COLORS.primaryDark} />
                     </View>
                     <View style={{ flex: 1 }}>
                        <Text style={styles.cardTypeTitle} numberOfLines={1}>Congés Payés Annuels</Text>
                        <Text style={styles.cardDatesSubtitle} numberOfLines={1}>
                          {new Date(c.startDate).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})} — {new Date(c.endDate).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})} ({d} jours)
                        </Text>
                     </View>
                   </View>
                   
                   <View style={styles.cardRight}>
                      <View style={[styles.statusPill, { backgroundColor: statusColor[c.status] + '20' }]}>
                        <Text style={[styles.statusPillText, {color: statusColor[c.status]}]}>{statusLabel[c.status].toUpperCase()}</Text>
                      </View>
                      {c.status === 'pending' && (
                        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(c._id)}>
                          <MaterialIcons name="more-vert" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                   </View>
                 </View>
               );
            })
          )}
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 90 }]} 
        onPress={() => setShowForm(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Demande</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>📅 Sélectionner la période</Text>
                {Platform.OS === 'ios' ? (
                  <View>
                    <View style={styles.dateRow}>
                      <TouchableOpacity style={styles.dateToggle} onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}>
                        <Text style={styles.dateToggleLabel}>Début</Text>
                        <Text style={styles.dateToggleValue}>{startDate.toLocaleDateString('fr-FR')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.arrowText}>→</Text>
                      <TouchableOpacity style={styles.dateToggle} onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}>
                        <Text style={styles.dateToggleLabel}>Fin</Text>
                        <Text style={styles.dateToggleValue}>{endDate.toLocaleDateString('fr-FR')}</Text>
                      </TouchableOpacity>
                    </View>
                    {showStartPicker && (<DateTimePicker value={startDate} mode="date" display="inline" minimumDate={new Date()} onChange={onIOSStartChange} locale="fr-FR" />)}
                    {showEndPicker && (<DateTimePicker value={endDate} mode="date" display="inline" minimumDate={startDate} onChange={onIOSEndChange} locale="fr-FR" />)}
                  </View>
                ) : (
                  <View style={styles.dateRow}>
                    <TouchableOpacity style={styles.dateToggle} onPress={() => openPicker('start')}>
                      <Text style={styles.dateToggleLabel}>Début</Text>
                      <Text style={styles.dateToggleValue}>{startDate.toLocaleDateString('fr-FR')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.arrowText}>→</Text>
                    <TouchableOpacity style={styles.dateToggle} onPress={() => openPicker('end')}>
                      <Text style={styles.dateToggleLabel}>Fin</Text>
                      <Text style={styles.dateToggleValue}>{endDate.toLocaleDateString('fr-FR')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {Platform.OS === 'android' && pickerTarget !== null && (
                <DateTimePicker value={pickerTarget === 'start' ? startDate : endDate} mode="date" display="calendar" minimumDate={pickerTarget === 'end' ? startDate : new Date()} onChange={onAndroidChange} />
              )}

              <Text style={styles.fieldLabel}>Motif *</Text>
              <TextInput style={styles.textArea} placeholder="Raison de l'absence..." value={reason} onChangeText={setReason} multiline numberOfLines={3} placeholderTextColor={COLORS.textLight} />

              {/* Pièce jointe */}
              <Text style={styles.fieldLabel}>Pièce jointe (optionnel)</Text>
              <TouchableOpacity style={styles.btnPickFile} onPress={handlePieceJointe} activeOpacity={0.7}>
                <Text style={styles.btnPickFileText}>
                  {pieceJointe ? `📎 ${pieceJointe.name}` : '📎 Ajouter une photo ou un fichier'}
                </Text>
              </TouchableOpacity>

              {/* Submit Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowForm(false); resetForm(); }}>
                  <Text style={styles.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSubmit, submitting && {opacity: 0.7}]} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.btnSubmitText}>Soumettre</Text>}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 24 },
  header: { paddingHorizontal: 24, paddingBottom: 8, backgroundColor: COLORS.background },
  subtitle: { fontSize: 10, fontWeight: '700', color: COLORS.secondary, letterSpacing: 1.5, marginBottom: 4 },
  headerTitleRow: { marginBottom: 12 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.primaryDark, letterSpacing: -0.5 },

  soldeCard: { backgroundColor: '#fcfaf6', borderRadius: 24, padding: 24, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e4e2de' },
  soldeCardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primaryDark, alignSelf: 'flex-start', marginBottom: 24 },
  
  ringContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  circleOuter: { width: 220, height: 220, borderRadius: 110, borderWidth: 10, borderColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', borderTopColor: '#e4e2de', borderRightColor: '#e4e2de', transform: [{rotate: '-45deg'}] },
  circleInner: { transform: [{rotate: '45deg'}], alignItems: 'center', justifyContent: 'center' },
  circleValueText: { fontSize: 56, fontWeight: '800', color: COLORS.primaryDark },
  circleDivider: { height: 4, width: 48, backgroundColor: '#c2c6d0', marginVertical: 8, borderRadius: 2 },
  circleSubText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  statsRow: { flexDirection: 'row', width: '100%', gap: 16 },
  statBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e4e2de' },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  statValPending: { fontSize: 20, fontWeight: '800', color: COLORS.primaryDark },
  statValApproved: { fontSize: 20, fontWeight: '800', color: COLORS.secondary },

  calendarCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#e4e2de', shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  calendarHeader: { marginBottom: 16 },
  calendarHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primaryDark },
  calGrid: { marginBottom: 16 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  calDayName: { fontSize: 10, fontWeight: '800', color: COLORS.textLight, width: 30, textAlign: 'center' },
  calDaysArray: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  calDayNum: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark, width: 30, textAlign: 'center', marginVertical: 4 },
  calLegend: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#e4e2de', paddingTop: 16 },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },

  historySection: { marginBottom: 24 },
  historyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 16 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.textLight, fontSize: 14, fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#fcfaf6', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e2de' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  cardIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTypeTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 4 },
  cardDatesSubtitle: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  delBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', right: 24, width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primaryDark, shadowOffset: {width:0, height:8}, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,54,100,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primaryDark },
  
  dateSection: { marginBottom: 16 },
  dateSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateToggle: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e4e2de' },
  dateToggleLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 4, fontWeight: '600' },
  dateToggleValue: { fontSize: 14, fontWeight: '800', color: COLORS.primaryDark },
  arrowText: { fontSize: 18, color: COLORS.textLight, fontWeight: '800' },
  
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark, marginBottom: 8, marginTop: 12 },
  textArea: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: '#e4e2de', borderRadius: 12, padding: 16, fontSize: 15, color: COLORS.primaryDark, fontWeight: '500', minHeight: 100, textAlignVertical: 'top' },
  btnPickFile: {
    borderWidth: 1.5, borderColor: '#e4e2de',
    borderRadius: 12, padding: 16, backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  btnPickFileText: { fontSize: 14, color: COLORS.primaryDark, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 12 },
  btnCancel: { flex: 1, backgroundColor: '#f5f3ef', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnCancelText: { color: COLORS.primaryDark, fontWeight: '800' },
  btnSubmit: { flex: 2, backgroundColor: COLORS.secondary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnSubmitText: { color: COLORS.white, fontWeight: '800' },
});
