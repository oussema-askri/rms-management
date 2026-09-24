import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Input, Button, PickerSelect, LoadingSpinner } from '../../components/common';
import { unwrap } from '../../api/unwrap';

// ✅ Updated to match backend enum values exactly
const PAYMENT_METHODS = [
  { label: 'Espèce', value: 'Espèce' },
  { label: 'Chèque', value: 'Chèque' },
  { label: 'Virement', value: 'Virement' },
  { label: 'Effet', value: 'Effet' },
];

const CURRENCIES = [
  { label: 'TND - Dinar Tunisien', value: 'TND' },
  { label: 'EUR - Euro', value: 'EUR' },
  { label: 'USD - Dollar', value: 'USD' },
];

const ClientFormScreen = ({ navigation, route }) => {
  const clientId = route.params?.clientId;
  const isEditing = !!clientId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    telephone: '',
    departement: '',
    tvaPercentage: '19',
    modePaiement: 'Virement',  // Default value
    devise: 'TND',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      const client = unwrap(response);
      setFormData({
        name: client.name || '',
        email: client.email || '',
        address: client.address || '',
        telephone: client.telephone || '',
        departement: client.departement || '',
        tvaPercentage: client.tvaPercentage?.toString() || '19',
        modePaiement: client.modePaiement || 'Virement',
        devise: client.devise || 'TND',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le client');
      navigation.goBack();
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
      newErrors.name = 'Le nom est requis';
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
        name: formData.name.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        telephone: formData.telephone.trim() || '',
        departement: formData.departement.trim() || '',
        tvaPercentage: parseFloat(formData.tvaPercentage) || 19,
        modePaiement: formData.modePaiement || 'Virement',
        devise: formData.devise || 'TND',
      };


      if (isEditing) {
        await api.put(`/clients/${clientId}`, payload);
        Alert.alert('Succès ✅', 'Client mis à jour avec succès');
      } else {
        await api.post('/clients', payload);
        Alert.alert('Succès ✅', 'Client créé avec succès');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Submit error:', error.response?.data || error.message);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Une erreur est survenue'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
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
        <Input
          label="Nom du client"
          value={formData.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Entrez le nom du client"
          required
          error={errors.name}
          icon="🏢"
        />

        <Input
          label="Email"
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          placeholder="email@exemple.com"
          keyboardType="email-address"
          error={errors.email}
          icon="📧"
        />

        <Input
          label="Téléphone"
          value={formData.telephone}
          onChangeText={(value) => handleChange('telephone', value)}
          placeholder="+216 XX XXX XXX"
          keyboardType="phone-pad"
          icon="📞"
        />

        <Input
          label="Adresse"
          value={formData.address}
          onChangeText={(value) => handleChange('address', value)}
          placeholder="Adresse complète"
          multiline
          numberOfLines={2}
          icon="📍"
        />

        <Input
          label="Département"
          value={formData.departement}
          onChangeText={(value) => handleChange('departement', value)}
          placeholder="Département"
          icon="🏛️"
        />

        <Input
          label="TVA (%)"
          value={formData.tvaPercentage}
          onChangeText={(value) => handleChange('tvaPercentage', value)}
          placeholder="19"
          keyboardType="numeric"
          icon="📊"
        />

        <PickerSelect
          label="Mode de paiement"
          value={formData.modePaiement}
          options={PAYMENT_METHODS}
          onValueChange={(value) => handleChange('modePaiement', value)}
          placeholder="Sélectionner..."
        />

        <PickerSelect
          label="Devise"
          value={formData.devise}
          options={CURRENCIES}
          onValueChange={(value) => handleChange('devise', value)}
          placeholder="Sélectionner..."
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          />
          <Button
            title={isEditing ? 'Mettre à jour' : 'Créer'}
            onPress={handleSubmit}
            loading={saving}
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default ClientFormScreen;