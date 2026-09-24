import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Input, Button } from '../../components/common';

const UniteFormScreen = ({ navigation, route }) => {
  const { clientId } = route.params;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    uniteName: '',
    responsable: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.uniteName.trim()) {
      newErrors.uniteName = 'Le nom de l\'unité est requis';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        uniteName: formData.uniteName.trim(),
        responsable: formData.responsable.trim() || '',
        email: formData.email.trim() || '',
        phone: formData.phone.trim() || '',
      };


      await api.post(`/clients/${clientId}/unites`, payload);
      Alert.alert(
        'Succès ✅',
        'Unité ajoutée avec succès',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding unite:', error.response?.data || error.message);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'ajouter l\'unité'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Une unité représente un bateau ou un équipement spécifique du client.
            Le numéro sera généré automatiquement.
          </Text>
        </View>

        {/* Form */}
        <Input
          label="Nom de l'unité"
          value={formData.uniteName}
          onChangeText={(value) => handleChange('uniteName', value)}
          placeholder="Ex: Yacht Princess 45"
          required
          error={errors.uniteName}
          icon="🚤"
        />

        <Input
          label="Responsable"
          value={formData.responsable}
          onChangeText={(value) => handleChange('responsable', value)}
          placeholder="Nom du responsable (optionnel)"
          icon="👤"
        />

        <Input
          label="Email du responsable"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          placeholder="email@exemple.com (optionnel)"
          keyboardType="email-address"
          error={errors.email}
          icon="📧"
        />

        <Input
          label="Téléphone"
          value={formData.phone}
          onChangeText={(value) => handleChange('phone', value)}
          placeholder="+216 XX XXX XXX (optionnel)"
          keyboardType="phone-pad"
          icon="📞"
        />

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          />
          <Button
            title="Ajouter l'unité"
            onPress={handleSubmit}
            loading={saving}
            icon="➕"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default UniteFormScreen;