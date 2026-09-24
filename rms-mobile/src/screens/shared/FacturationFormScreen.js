import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { formatDateForInput } from '../../utils/formatters';

// ── French number to words ────────────────────────────────────────────────
const ONES = ['','Un','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf',
  'Dix','Onze','Douze','Treize','Quatorze','Quinze','Seize','Dix-Sept','Dix-Huit','Dix-Neuf'];
const TENS = ['','','Vingt','Trente','Quarante','Cinquante','Soixante'];

function bH(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n/10), u = n%10;
  if (t===7){if(u===0)return'Soixante-Dix';if(u===1)return'Soixante et Onze';return'Soixante-'+ONES[10+u];}
  if (t===8){if(u===0)return'Quatre-Vingts';return'Quatre-Vingt-'+ONES[u];}
  if (t===9){if(u===0)return'Quatre-Vingt-Dix';return'Quatre-Vingt-'+ONES[10+u];}
  if (u===0)return TENS[t]; if(u===1)return TENS[t]+' et Un'; return TENS[t]+'-'+ONES[u];
}
function bT(n){if(n<100)return bH(n);const h=Math.floor(n/100),r=n%100;const cw=h===1?'Cent':ONES[h]+' Cent'+(r===0&&h>1?'s':'');return r===0?cw:cw+' '+bH(r);}
function itf(n){if(n===0)return'Zéro';if(n<1000)return bT(n);if(n<1000000){const th=Math.floor(n/1000),r=n%1000;const w=th===1?'Mille':bT(th)+' Mille';return r===0?w:w+' '+bT(r);}const m=Math.floor(n/1000000),r=n%1000000;const w=m===1?'Un Million':bT(m)+' Millions';return r===0?w:w+' '+itf(r);}
// Round to millimes before splitting the amount. Rounding the fraction on its
// own turns 1.9999 into "Un et Mille Millimes" instead of "Deux", which made
// this preview disagree with the document the server generates.
// Kept in sync with backend/utils/generateFacturationDocument.js and the web
// copy in components/rh/Facturation.js.
function toWords(n) {
  const num = parseFloat(n) || 0;
  const totalMillimes = Math.round(num * 1000);
  const ip = Math.floor(totalMillimes / 1000);
  const mp = totalMillimes % 1000;
  let res = itf(ip);
  if (mp > 0) res += ' et ' + itf(mp) + ' Millimes';
  return res + ' Dinars HT';
}

export default function FacturationFormScreen({ navigation }) {
  const [bons, setBons] = useState([]);
  const [loadingBons, setLoadingBons] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [prices, setPrices] = useState({});
  const [step, setStep] = useState(1); // 1=select, 2=prices+meta

  // Invoice metadata
  const [factureNumber, setFactureNumber] = useState('');
  const [factureDate, setFactureDate] = useState(formatDateForInput(new Date()));
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [generating, setGenerating] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get('/bon-de-reception')
      .then(r => {
        // filter out bons that are already factured
        const availableBons = (r.data?.data || []).filter(b => !b.facture && b.status === 'signed');
        setBons(availableBons);
      })
      .catch(() => setBons([]))
      .finally(() => setLoadingBons(false));
  }, []));

  const toggleBon = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedBons = bons.filter(b => selectedIds.has(b._id));

  const lineItems = selectedBons.flatMap(bon =>
    (bon.taches || []).map((tache, idx) => ({ bon, tache, idx }))
  );

  const getU = (bonId, idx) => prices[`${bonId}_${idx}`] ?? '';
  const setU = (bonId, idx, val) => setPrices(prev => ({ ...prev, [`${bonId}_${idx}`]: val }));
  const getT = (bonId, idx, qty) => {
    const u = parseFloat(getU(bonId, idx));
    return isNaN(u) || u < 0 ? null : u * (qty || 0);
  };

  const totalHT = lineItems.reduce((s, { bon, tache, idx }) => {
    const t = getT(bon._id, idx, tache.quantite);
    return s + (t ?? 0);
  }, 0);

  const goStep2 = () => {
    if (selectedIds.size === 0) { Alert.alert('Sélection vide', 'Sélectionnez au moins un bon.'); return; }
    const first = bons.find(b => selectedIds.has(b._id));
    if (first && !clientName) setClientName(first.clientName || '');
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!factureNumber.trim()) { Alert.alert('Champ requis', 'Veuillez saisir le numéro de facture.'); return; }
    setGenerating(true);
    try {
      const items = lineItems.map(({ bon, tache, idx }) => ({
        description: [tache.description, tache.materielsNecessaires].filter(Boolean).join(' - '),
        unite: tache.uniteQuantite || '',
        quantite: tache.quantite ?? 0,
        prixUHT: parseFloat(getU(bon._id, idx)) || 0,
        prixTHT: getT(bon._id, idx, tache.quantite) || 0,
       }));

       // POST /facturation
       const response = await api.post('/facturation', {
         factureNumber, date: factureDate, clientName, clientAddress, clientTel, items, totalHT, bonIds: Array.from(selectedIds)
       });

       if (response.data.success) {
         // Auto-download logic via download route
         const factureId = response.data.data._id;
         const dlResponse = await api.get(`/facturation/${factureId}/download`, { responseType: 'arraybuffer' });
         
         const base64 = arrayBufferToBase64(dlResponse.data);
         const filename = `Facture-${factureNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.docx`;
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
         }
         
         // Navigate back to history list
         navigation.goBack();
         Alert.alert('Succès', 'Facture générée avec succès.');
       }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de créer la facture.');
    } finally {
      setGenerating(false);
    }
  };

  if (loadingBons) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des bons disponibles...</Text>
      </View>
    );
  }

  // ── Step 1: Select BDRs ──────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Bons de Réception</Text>
            <Text style={styles.stepSub}>
              {selectedIds.size === 0 ? 'Appuyez pour sélectionner' : `${selectedIds.size} bon(s) sélectionné(s)`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnPrimary, selectedIds.size === 0 && styles.btnDisabled]}
            onPress={goStep2}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.btnPrimaryText}>Suivant →</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={bons}
          keyExtractor={b => b._id}
          contentContainerStyle={styles.bonList}
          renderItem={({ item: bon }) => {
            const sel = selectedIds.has(bon._id);
            return (
              <TouchableOpacity
                style={[styles.bonCard, sel && styles.bonCardSelected]}
                onPress={() => toggleBon(bon._id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, sel && styles.checkboxChecked]}>
                  {sel && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View style={styles.bonInfo}>
                  <Text style={styles.bonNum}>{bon.bonNumber}</Text>
                  <Text style={styles.bonClient}>{bon.clientName}</Text>
                  <View style={styles.bonMeta}>
                    <Text style={styles.bonUnite}>{bon.unite}</Text>
                    <Text style={[styles.bonStatus, { color: '#27976A' }]}>
                      Signé ({bon.taches?.length || 0} tâche(s))
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucun bon disponible à facturer.</Text>
            </View>
          }
        />
      </View>
    );
  }

  // ── Step 2: Prices + metadata ────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.step2Content}>
      {/* Header */}
      <View style={styles.stepHeader}>
        <TouchableOpacity style={styles.btnBack} onPress={() => setStep(1)}>
          <Text style={styles.btnBackText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, styles.btnGreen, generating && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.btnPrimaryText}>Générer</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Invoice metadata */}
      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>Détails de la Facture</Text>

        <Text style={styles.fieldLabel}>Facture N° *</Text>
        <TextInput
          style={[styles.fieldInput, styles.fieldRequired]}
          value={factureNumber}
          onChangeText={setFactureNumber}
          placeholder="Ex: CTN-LU3-008-2025"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput
          style={styles.fieldInput}
          value={factureDate}
          onChangeText={setFactureDate}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Client</Text>
        <TextInput
          style={styles.fieldInput}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Nom du client"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Adresse Client</Text>
        <TextInput
          style={styles.fieldInput}
          value={clientAddress}
          onChangeText={setClientAddress}
          placeholder="Adresse"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.fieldLabel}>Tél Client</Text>
        <TextInput
          style={styles.fieldInput}
          value={clientTel}
          onChangeText={setClientTel}
          placeholder="+216 ..."
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
        />
      </View>

      {/* Line items */}
      <Text style={styles.sectionHeading}>Lignes de la Facture ({lineItems.length})</Text>
      {lineItems.map(({ bon, tache, idx }) => {
        const prixU = getU(bon._id, idx);
        const prixT = getT(bon._id, idx, tache.quantite);
        return (
          <View key={`${bon._id}_${idx}`} style={[styles.lineCard, prixU !== '' && styles.lineCardPriced]}>
            <View style={styles.lineTop}>
              <View style={styles.lineBadge}>
                <Text style={styles.lineBadgeText}>{bon.bonNumber}</Text>
              </View>
              <Text style={styles.lineUnite}>{tache.uniteQuantite || '—'}</Text>
              <Text style={styles.lineQty}>Qté: {tache.quantite ?? '—'}</Text>
            </View>
            <Text style={styles.lineDesc} numberOfLines={2}>
              {tache.description || '—'}
            </Text>
            <View style={styles.linePriceRow}>
              <View style={styles.linePriceCol}>
                <Text style={styles.linePriceLabel}>Prix U HT</Text>
                <TextInput
                  style={styles.priceInput}
                  value={prixU}
                  onChangeText={v => setU(bon._id, idx, v)}
                  placeholder="0.000"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.linePriceCol}>
                <Text style={styles.linePriceLabel}>Total HT</Text>
                <View style={styles.prixTBox}>
                  <Text style={[styles.prixTVal, prixT !== null && prixT > 0 && styles.prixTValGreen]}>
                    {prixT !== null ? prixT.toFixed(3) : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL NET</Text>
        <Text style={styles.totalValue}>{totalHT.toFixed(3)} TND</Text>
      </View>

      {/* Amount in words */}
      <View style={styles.wordsCard}>
        <Text style={styles.wordsLabel}>Montant en lettres :</Text>
        <Text style={styles.wordsValue}>{toWords(totalHT)}</Text>
      </View>
    </ScrollView>
  );
}

// Convert arraybuffer to base64 (React Native compatible)
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: COLORS.textLight, fontSize: 14 },
  emptyText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center' },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 45,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  stepSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  btnPrimary: {
    backgroundColor: '#003664',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
  btnGreen: { backgroundColor: '#785A00' }, // using brass gradient solid
  btnBack: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnBackText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },

  bonList: { padding: 12, gap: 10 },
  bonCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  bonCardSelected: {
    borderColor: '#003664',
    backgroundColor: '#e6edf5', // light primary
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#003664', borderColor: '#003664' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  bonInfo: { flex: 1 },
  bonNum: { fontSize: 15, fontWeight: '700', color: '#003664' },
  bonClient: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  bonMeta: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' },
  bonUnite: { fontSize: 11, color: '#003664', backgroundColor: '#e6edf5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  bonTaches: { fontSize: 11, color: COLORS.textLight },
  bonStatus: { fontSize: 11, fontWeight: '700' },

  step2Content: { paddingBottom: 40 },
  metaCard: {
    margin: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight
  },
  metaTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  fieldRequired: { borderColor: '#785A00' },

  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  lineCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border,
  },
  lineCardPriced: { borderLeftColor: '#785A00', backgroundColor: '#FDFBF4' },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lineBadge: { backgroundColor: '#e6edf5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#B3C8E0' },
  lineBadgeText: { color: '#003664', fontSize: 11, fontWeight: '700' },
  lineUnite: { fontSize: 12, color: COLORS.textLight, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  lineQty: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 'auto' },
  lineDesc: { fontSize: 13, color: COLORS.text, fontWeight: '500', marginBottom: 10 },
  linePriceRow: { flexDirection: 'row', gap: 12 },
  linePriceCol: { flex: 1 },
  linePriceLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
    backgroundColor: COLORS.white,
  },
  prixTBox: {
    borderWidth: 1,
    borderColor: '#e6edf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#f9fbfd',
    alignItems: 'flex-end',
  },
  prixTVal: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  prixTValGreen: { color: '#003664', fontWeight: '700' },

  totalCard: {
    margin: 12,
    backgroundColor: '#003664',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  totalLabel: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  totalValue: { color: '#fff', fontSize: 18, fontWeight: '800' },

  wordsCard: {
    marginHorizontal: 12,
    backgroundColor: '#FDFBF4',
    borderLeftWidth: 4,
    borderLeftColor: '#785A00',
    borderRadius: 8,
    padding: 14,
  },
  wordsLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  wordsValue: { fontSize: 13, fontWeight: '700', fontStyle: 'italic', color: '#785A00', lineHeight: 20 },
});
