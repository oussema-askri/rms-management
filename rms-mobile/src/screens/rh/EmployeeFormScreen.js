import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { LoadingSpinner, AuthImage } from '../../components/common';

// Must match the etatSocial enum in backend/models/User.js exactly. The form
// used to send 'Marié' and 'Divorcé', which the enum rejects, so every save
// carrying a marital status failed validation.
const ETAT_SOCIAL_OPTIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'];

const EmployeeFormScreen = ({ route, navigation }) => {
  const { employeeId } = route.params || {};
  const isEditing = !!employeeId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employer');
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cnss, setCnss] = useState('');
  const [etatSocial, setEtatSocial] = useState('');
  const [salary, setSalary] = useState('');
  const [employeeType, setEmployeeType] = useState('salarie');
  const [dailyRate, setDailyRate] = useState('');

  // Images
  const [photo, setPhoto] = useState(null);
  const [cinImage, setCinImage] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cinImagePreview, setCinImagePreview] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchEmployee();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/rh/employees/${employeeId}`);
      const employee = response.data.data || response.data;

      setName(employee.name || '');
      setEmail(employee.email || '');
      setRole(employee.role || 'employer');
      setCin(employee.cin || '');
      setPhone(employee.phone || '');
      setAddress(employee.address || '');
      setCnss(employee.cnss || '');
      setEtatSocial(employee.etatSocial || '');
      setSalary(employee.salary?.toString() || '');
      setEmployeeType(employee.employeeType || 'salarie');
      setDailyRate(employee.dailyRate?.toString() || '');

      // Store the stored PATH, not a bare URL. /uploads needs the session
      // token, and the old replace('/api','') also mangled any host containing
      // the word "api". AuthImage handles both.
      if (employee.photo) setPhotoPreview({ storedPath: employee.photo });
      if (employee.cinImage) setCinImagePreview({ storedPath: employee.cinImage });
    } catch (error) {
      console.error('Error fetching employee:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'employé');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à vos photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'photo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'photo') {
          setPhoto(result.assets[0]);
          setPhotoPreview(result.assets[0].uri);
        } else {
          setCinImage(result.assets[0]);
          setCinImagePreview(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async (type) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à votre caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'photo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'photo') {
          setPhoto(result.assets[0]);
          setPhotoPreview(result.assets[0].uri);
        } else {
          setCinImage(result.assets[0]);
          setCinImagePreview(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo');
    }
  };

  const showImagePicker = (type) => {
    Alert.alert(
      'Choisir une image',
      'Comment souhaitez-vous ajouter une image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Galerie', onPress: () => pickImage(type) },
        { text: 'Caméra', onPress: () => takePhoto(type) },
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer l\'email');
      return false;
    }
    if (!isEditing && !password.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le mot de passe');
      return false;
    }
    if (!cin.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le CIN');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('role', role);
      formData.append('cin', cin.trim());
      formData.append('phone', phone.trim());
      formData.append('address', address.trim());
      formData.append('cnss', cnss.trim());
      formData.append('etatSocial', etatSocial.trim());
      formData.append('salary', salary.trim() || '0');
      formData.append('employeeType', employeeType);
      formData.append('dailyRate', dailyRate.trim() || '0');

      if (!isEditing && password.trim()) {
        formData.append('password', password.trim());
      }

      // Append images if selected
      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        });
      }

      if (cinImage) {
        formData.append('cinImage', {
          uri: cinImage.uri,
          type: 'image/jpeg',
          name: 'cin.jpg',
        });
      }

      if (isEditing) {
        await api.put(`/rh/employees/${employeeId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Succès', 'Employé modifié avec succès');
      } else {
        await api.post('/rh/employees', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Succès', 'Employé créé avec succès');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error submitting employee:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de sauvegarder l\'employé');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Photo de Profil</Text>
        <TouchableOpacity style={styles.imageContainer} onPress={() => showImagePicker('photo')}>
          {photoPreview ? (
            photoPreview.storedPath ? (
              <AuthImage path={photoPreview.storedPath} style={styles.photoPreview} />
            ) : (
              <Image source={{ uri: photoPreview.uri || photoPreview }} style={styles.photoPreview} />
            )
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>👤</Text>
              <Text style={styles.imagePlaceholderLabel}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informations de Base</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nom Complet *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Ahmed Ben Ali"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="exemple@email.com"
            placeholderTextColor={COLORS.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {!isEditing && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Mot de Passe *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Rôle *</Text>
          <View style={styles.roleButtons}>
            {[
              { value: 'employer', label: 'Employé' },
              { value: 'responsable', label: 'Responsable' },
              { value: 'rh', label: 'RH' },
              { value: 'comptable', label: 'Comptable' },
              { value: 'admin', label: 'Admin' },
            ].map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleButton, role === r.value && styles.roleButtonActive]}
                onPress={() => setRole(r.value)}
              >
                <Text style={[styles.roleButtonText, role === r.value && styles.roleButtonTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Type d'Employé</Text>
          <View style={styles.roleButtons}>
            {[
              { value: 'salarie', label: 'Salarié' },
              { value: 'taux_journalier', label: 'Journalier' },
              { value: 'prestataire', label: 'Prestataire' },
            ].map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.roleButton, employeeType === t.value && styles.roleButtonActive]}
                onPress={() => setEmployeeType(t.value)}
              >
                <Text style={[styles.roleButtonText, employeeType === t.value && styles.roleButtonTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CIN *</Text>
          <TextInput
            style={styles.input}
            value={cin}
            onChangeText={setCin}
            placeholder="Numéro CIN"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: +216 12 345 678"
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Adresse complète"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Professional Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💼 Informations Professionnelles</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CNSS</Text>
          <TextInput
            style={styles.input}
            value={cnss}
            onChangeText={setCnss}
            placeholder="Numéro CNSS"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>État Social</Text>
          <View style={styles.roleButtons}>
            {ETAT_SOCIAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.roleButton, etatSocial === option && styles.roleButtonActive]}
                onPress={() => setEtatSocial(option)}
              >
                <Text style={[styles.roleButtonText, etatSocial === option && styles.roleButtonTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Salaire Mensuel (TND)</Text>
          <TextInput
            style={styles.input}
            value={salary}
            onChangeText={setSalary}
            placeholder="Ex: 1500"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </View>

        {employeeType === 'taux_journalier' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Taux Journalier (TND/jour)</Text>
            <TextInput
              style={styles.input}
              value={dailyRate}
              onChangeText={setDailyRate}
              placeholder="Ex: 120"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
          </View>
        )}
      </View>

      {/* CIN Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪪 Photo CIN</Text>
        <TouchableOpacity style={styles.imageContainer} onPress={() => showImagePicker('cinImage')}>
          {cinImagePreview ? (
            cinImagePreview.storedPath ? (
              <AuthImage path={cinImagePreview.storedPath} style={styles.cinPreview} />
            ) : (
              <Image source={{ uri: cinImagePreview.uri || cinImagePreview }} style={styles.cinPreview} />
            )
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📄</Text>
              <Text style={styles.imagePlaceholderLabel}>Ajouter photo CIN</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Envoi...' : isEditing ? 'Modifier' : 'Créer'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    height: 80,
    paddingTop: 14,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  roleButtonTextActive: {
    color: COLORS.white,
  },
  imageContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cinPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default EmployeeFormScreen;
