import React, { useState, useEffect } from 'react';
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
import { Input, Button, LoadingSpinner } from '../../components/common';
import { unwrap } from '../../api/unwrap';

const SousTitreFormScreen = ({ navigation, route }) => {
  const { clientId, uniteId } = route.params;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uniteName, setUniteName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUniteInfo();
  }, []);

  const fetchUniteInfo = async () => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      const client = unwrap(response);
      const unite = client.unites?.find(u => u._id === uniteId);
      if (unite) {
        setUniteName(unite.uniteName);
      }
    } catch (error) {
      console.error('Error fetching unite info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du sous-titre est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await api.post(
        `/clients/${clientId}/unites/${uniteId}/sous-titres`, 
        formData
      );
      Alert.alert(
        'Succès ✅',
        'Sous-titre ajouté avec succès',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding sous-titre:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'ajouter le sous-titre'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

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
        {/* Unite Info */}
        {uniteName && (
          <View style={styles.uniteInfoBox}>
            <Text style={styles.uniteInfoLabel}>Unité:</Text>
            <Text style={styles.uniteInfoName}>{uniteName}</Text>
          </View>
        )}

        {/* Header Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Un sous-titre représente une partie ou un composant spécifique de l'unité
            (ex: Moteur principal, Système électrique, Coque, etc.)
          </Text>
        </View>

        {/* Form */}
        <Input
          label="Nom du sous-titre"
          value={formData.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Ex: Moteur principal"
          required
          error={errors.name}
          icon="🔧"
        />

        {/* Example suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
          <View style={styles.suggestionsGrid}>
            {[
              'Moteur principal',
              'Moteur auxiliaire',
              'Système électrique',
              'Coque',
              'Pont',
              'Système hydraulique',
              'Climatisation',
              'Navigation',
            ].map((suggestion, index) => (
              <View
                key={index}
                style={styles.suggestionChip}
              >
                <Text
                  style={styles.suggestionText}
                  onPress={() => handleChange('name', suggestion)}
                >
                  {suggestion}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          />
          <Button
            title="Ajouter"
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
  uniteInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  uniteInfoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
  },
  uniteInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
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
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default SousTitreFormScreen;