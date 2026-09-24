import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../constants/expenses';

const ExpenseFormScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [amountStr, setAmountStr] = useState('0');
  const [category, setCategory] = useState('Transport');
  const [paymentMethod, setPaymentMethod] = useState('espece');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);

  const handleDial = (char) => {
    if (char === 'DEL') {
      setAmountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (char === '.') {
      if (!amountStr.includes('.')) setAmountStr(prev => prev + '.');
    } else {
      if (amountStr === '0') {
        setAmountStr(char);
      } else {
        // limit logic (e.g. max 99999.999)
        const parts = amountStr.split('.');
        if (parts[1] && parts[1].length >= 3) return; // TunD is 3 decimals max
        if (amountStr.length < 10) setAmountStr(prev => prev + char);
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission refusée', 'Accès galerie requis');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission refusée', 'Caméra requise');

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (parseFloat(amountStr) <= 0) return Alert.alert('Erreur', 'Le montant est invalide');
    if (!image) return Alert.alert('Erreur', 'La facture/reçu est obligatoire');
    if (!description.trim()) return Alert.alert('Erreur', 'La description est obligatoire');

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('description', description);
      formDataToSend.append('amount', amountStr);
      formDataToSend.append('paymentMethod', paymentMethod);
      formDataToSend.append('category', category);

      const filename = image.uri.split('/').pop() || 'expense.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formDataToSend.append('facture', {
        uri: image.uri,
        name: filename,
        type: type,
      });

      await api.post('/expenses', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });

      Alert.alert('Succès', 'Dépense créée', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de créer la dépense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 12}}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle Dépense</Text>
        </View>
        <Text style={styles.headerSubtitle}>Soumission rapide de justificatif</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Description Field */}
        <View style={styles.descContainer}>
          <TextInput
            style={styles.descInput}
            placeholder="Description courte de la dépense..."
            value={description}
            onChangeText={setDescription}
            maxLength={100}
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Camera / Preview Section */}
        <View style={styles.cameraSection}>
          <TouchableOpacity 
            style={styles.cameraBox} 
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert('Facture', 'Choisir la source', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Galerie', onPress: pickImage },
                { text: 'Caméra', onPress: takePhoto },
              ]);
            }}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.cameraEmpty}>
                <View style={styles.cameraIconBox}>
                  <MaterialIcons name="photo-camera" size={32} color={COLORS.white} />
                </View>
                <Text style={styles.cameraEmptyText}>Prendre une photo</Text>
              </View>
            )}
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{image ? 'CAPTÉ' : 'PRÊT'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Amount Box */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>MONTANT (TND)</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{amountStr}</Text>
            <Text style={styles.amountCurrency}>TND</Text>
          </View>
          
          {/* Dialpad */}
          <View style={styles.dialpadGrid}>
            {['1','2','3','4','5','6','7','8','9','.', '0', 'DEL'].map((char, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dialBtn, char === 'DEL' && styles.dialBtnDel]}
                onPress={() => handleDial(char)}
                activeOpacity={0.7}
              >
                {char === 'DEL' ? (
                  <MaterialIcons name="backspace" size={24} color={COLORS.danger} />
                ) : (
                  <Text style={styles.dialBtnText}>{char}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <MaterialIcons name="payments" size={20} color={COLORS.secondary} />
            <Text style={styles.categoryTitle}>Mode de Paiement</Text>
          </View>
          <View style={styles.categoryList}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.catPill, paymentMethod === m.value && styles.catPillActive]}
                onPress={() => setPaymentMethod(m.value)}
              >
                <MaterialIcons
                  name={m.icon}
                  size={18}
                  color={paymentMethod === m.value ? COLORS.white : COLORS.primaryDark}
                />
                <Text style={[styles.catPillText, paymentMethod === m.value && { color: COLORS.white }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <MaterialIcons name="category" size={20} color={COLORS.secondary} />
            <Text style={styles.categoryTitle}>Catégorie</Text>
          </View>
          <View style={styles.categoryList}>
            {EXPENSE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.catPill, category === cat.value && styles.catPillActive]}
                onPress={() => setCategory(cat.value)}
              >
                <MaterialIcons 
                  name={cat.icon} 
                  size={18} 
                  color={category === cat.value ? COLORS.white : COLORS.primaryDark} 
                />
                <Text style={[styles.catPillText, category === cat.value && {color: COLORS.white}]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Persistent Button */}
      <View style={[styles.submitWrapper, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSubmit} 
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>{saving ? 'TRAITEMENT...' : 'SOUMETTRE LA DÉPENSE'}</Text>
          <MaterialIcons name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#003664',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingLeft: 36,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  descContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  descInput: {
    fontSize: 16,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  cameraSection: {
    marginBottom: 24,
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#eae8e4',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cameraEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cameraEmptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  statusChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  amountCard: {
    backgroundColor: '#f5f3ef',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e4e2de',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003664',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#c2c6d0',
    paddingBottom: 8,
    marginBottom: 24,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#003664',
  },
  amountCurrency: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  dialpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  dialBtn: {
    width: '31%',
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dialBtnDel: {
    backgroundColor: COLORS.danger + '10',
  },
  dialBtnText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#003664',
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003664',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  catPillActive: {
    backgroundColor: COLORS.secondary,
  },
  catPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#003664',
  },
  submitWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background + 'EE',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default ExpenseFormScreen;