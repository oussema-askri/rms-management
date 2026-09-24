import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { Input, Button, PickerSelect, LoadingSpinner } from '../../components/common';
import { formatDateForInput } from '../../utils/formatters';
import { unwrapList } from '../../api/unwrap';

// WORK_TYPES was removed: the Planning model no longer has a workType field and
// nothing in this form referenced the list.

const UNITE_QUANTITE = [
  { label: 'FTF', value: 'FTF' },
  { label: 'U', value: 'U' },
  { label: 'ML', value: 'ML' },
  { label: 'M²', value: 'M²' },
  { label: 'H/J', value: 'H/J' },
];

const STATUS_OPTIONS = [
  { label: 'En attente', value: 'pending' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'cancelled' },
];

const PlanningFormScreen = ({ navigation, route }) => {
  const planningId = route.params?.planningId;
  const isEditing = !!planningId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [distinctMateriels, setDistinctMateriels] = useState([]);
  const [formData, setFormData] = useState({
    client: '',
    unite: '',
    sousTitre: '',
    description: '',
    materielsNecessaires: '',
    date: formatDateForInput(new Date()),
    quantite: '1',
    uniteQuantite: 'FTF',
    status: 'pending',
    assignedWorkers: [],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch clients
      const clientsRes = await api.get('/clients');
      const clientsData = unwrapList(clientsRes);
      setClients(clientsData);

      // Fetch employees
      try {
        const employeesRes = await api.get('/rh/employees');
        const employeesData = Array.isArray(employeesRes.data)
          ? employeesRes.data
          : employeesRes.data?.data || [];
        // Responsables are assignable too; the calendar already lists them.
        setEmployees(employeesData.filter(
          e => e.isAvailable && ['employer', 'responsable'].includes(e.role)
        ));
      } catch (e) {
        console.warn('Could not fetch employees:', e.message);
      }

      // Fetch distinct materiels
      try {
        const materielsRes = await api.get('/planning/materiels/distinct');
        const mateData = materielsRes.data?.data || materielsRes.data;
        if (Array.isArray(mateData)) {
          setDistinctMateriels(mateData);
        }
      } catch (e) {
        console.warn('Could not fetch distinct materiels:', e.message);
      }

      // If editing, fetch planning data
      if (isEditing) {
        const planningRes = await api.get(`/planning/${planningId}`);
        const planning = planningRes.data?.data || planningRes.data;
        
        if (planning) {
          setFormData({
            client: planning.client?._id || planning.client || '',
            unite: planning.uniteNumber || '',
            sousTitre: planning.sousTitreRef || '',
            description: planning.description || '',
            materielsNecessaires: planning.materielsNecessaires || '',
            date: planning.date?.split('T')[0] || formatDateForInput(new Date()),
            quantite: planning.quantite?.toString() || '1',
            uniteQuantite: planning.uniteQuantite || 'FTF',
            status: planning.status || 'pending',
            assignedWorkers: planning.assignedWorkers?.map(w => w._id || w) || [],
          });

          // Find and set selected client
          const client = clientsData.find(c => 
            c._id === (planning.client?._id || planning.client)
          );
          if (client) {
            setSelectedClient(client);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialClick = (mat) => {
    setFormData(prev => {
      const current = prev.materielsNecessaires ? prev.materielsNecessaires.trim() : '';
      return {
        ...prev,
        materielsNecessaires: current ? `${current}\n${mat}` : mat
      };
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    setSelectedClient(client);
    handleChange('client', clientId);
    handleChange('unite', '');
    handleChange('sousTitre', '');
  };

  const handleUniteChange = (uniteNumber) => {
    handleChange('unite', uniteNumber);
    handleChange('sousTitre', '');
  };

  const toggleWorker = (workerId) => {
    setFormData(prev => {
      const current = prev.assignedWorkers || [];
      if (current.includes(workerId)) {
        return { ...prev, assignedWorkers: current.filter(id => id !== workerId) };
      } else {
        return { ...prev, assignedWorkers: [...current, workerId] };
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.client) {
      newErrors.client = 'Veuillez sélectionner un client';
    }
    if (!formData.unite) {
      newErrors.unite = 'Veuillez sélectionner une unité';
    }
    if (!formData.date) {
      newErrors.date = 'Veuillez sélectionner une date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // Find selected unite to get full data
      const unite = selectedClient?.unites?.find(u => u.uniteNumber === formData.unite);
      const sousTitre = unite?.sousTitres?.find(st => st.refNumber === formData.sousTitre);

      const payload = {
        client: formData.client,
        clientName: selectedClient?.name,
        unite: unite?.uniteName || formData.unite,
        uniteNumber: formData.unite,
        sousTitre: sousTitre?.name || '',
        sousTitreRef: formData.sousTitre,
        description: formData.description,
        materielsNecessaires: formData.materielsNecessaires,
        date: formData.date,
        quantite: parseFloat(formData.quantite) || 1,
        uniteQuantite: formData.uniteQuantite,
        status: formData.status,
        assignedWorkers: formData.assignedWorkers,
      };


      if (isEditing) {
        await api.put(`/planning/${planningId}`, payload);
        Alert.alert('Succès ✅', 'Tâche mise à jour avec succès');
      } else {
        await api.post('/planning', payload);
        Alert.alert('Succès ✅', 'Tâche créée avec succès');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving planning:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible de sauvegarder'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Prepare picker options
  const clientOptions = clients.map(c => ({
    label: `${c.clientNumber} - ${c.name}`,
    value: c._id,
  }));

  const uniteOptions = selectedClient?.unites?.map(u => ({
    label: `${u.uniteNumber} - ${u.uniteName}`,
    value: u.uniteNumber,
  })) || [];

  const selectedUnite = selectedClient?.unites?.find(u => u.uniteNumber === formData.unite);
  const sousTitreOptions = selectedUnite?.sousTitres?.map(st => ({
    label: `${st.refNumber} - ${st.name}`,
    value: st.refNumber,
  })) || [];

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
        {/* Client Selection */}
        <Text style={styles.sectionTitle}>📋 Informations Client</Text>
        
        <PickerSelect
          label="Client"
          value={formData.client}
          options={clientOptions}
          onValueChange={handleClientChange}
          placeholder="Sélectionner un client..."
          required
          error={errors.client}
        />

        <PickerSelect
          label="Unité"
          value={formData.unite}
          options={uniteOptions}
          onValueChange={handleUniteChange}
          placeholder="Sélectionner une unité..."
          required
          error={errors.unite}
          disabled={!selectedClient}
        />

        {sousTitreOptions.length > 0 && (
          <PickerSelect
            label="Sous-titre (optionnel)"
            value={formData.sousTitre}
            options={sousTitreOptions}
            onValueChange={(value) => handleChange('sousTitre', value)}
            placeholder="Sélectionner un sous-titre..."
          />
        )}

        {/* Work Details */}
        <Text style={styles.sectionTitle}>🔧 Détails du Travail</Text>

        <Input
          label="Description"
          value={formData.description}
          onChangeText={(value) => handleChange('description', value)}
          placeholder="Décrivez le travail à effectuer..."
          multiline
          numberOfLines={3}
          icon="📝"
        />

        <Input
          label="Matériels nécessaires"
          value={formData.materielsNecessaires}
          onChangeText={(value) => handleChange('materielsNecessaires', value)}
          placeholder="Liste des matériels..."
          multiline
          numberOfLines={2}
          icon="🧰"
        />

        {distinctMateriels.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyLabel}>Historique récent :</Text>
            <View style={styles.historyChips}>
              {distinctMateriels.map((mat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.historyChip}
                  onPress={() => handleMaterialClick(mat)}
                >
                  <Text style={styles.historyChipText} numberOfLines={1}>
                    + {mat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Date and Quantity */}
        <Text style={styles.sectionTitle}>📅 Planification</Text>

        <Input
          label="Date"
          value={formData.date}
          onChangeText={(value) => handleChange('date', value)}
          placeholder="AAAA-MM-JJ"
          icon="📅"
          error={errors.date}
        />

        <View style={styles.rowContainer}>
          <View style={styles.halfWidth}>
            <Input
              label="Quantité"
              value={formData.quantite}
              onChangeText={(value) => handleChange('quantite', value)}
              placeholder="1"
              keyboardType="numeric"
              icon="📊"
            />
          </View>
          <View style={styles.halfWidth}>
            <PickerSelect
              label="Unité"
              value={formData.uniteQuantite}
              options={UNITE_QUANTITE}
              onValueChange={(value) => handleChange('uniteQuantite', value)}
            />
          </View>
        </View>

        {/* Status (for editing) */}
        {isEditing && (
          <>
            <Text style={styles.sectionTitle}>📊 Statut</Text>
            <PickerSelect
              label="Statut"
              value={formData.status}
              options={STATUS_OPTIONS}
              onValueChange={(value) => handleChange('status', value)}
            />
          </>
        )}

        {/* Workers Assignment */}
        {employees.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>👷 Ouvriers Assignés</Text>
            <View style={styles.workersContainer}>
              {employees.map((employee) => (
                <TouchableOpacity
                  key={employee._id}
                  style={[
                    styles.workerChip,
                    formData.assignedWorkers?.includes(employee._id) && styles.workerChipActive,
                  ]}
                  onPress={() => toggleWorker(employee._id)}
                >
                  <Text style={styles.workerEmoji}>👤</Text>
                  <Text
                    style={[
                      styles.workerName,
                      formData.assignedWorkers?.includes(employee._id) && styles.workerNameActive,
                    ]}
                  >
                    {employee.name}
                  </Text>
                  {formData.assignedWorkers?.includes(employee._id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Buttons */}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  workersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  workerChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  workerEmoji: {
    fontSize: 16,
  },
  workerName: {
    fontSize: 14,
    color: COLORS.text,
  },
  workerNameActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: 'bold',
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
  historyContainer: {
    marginTop: -8,
    marginBottom: 16,
  },
  historyLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: COLORS.primary + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  historyChipText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    maxWidth: 200,
  },
});

export default PlanningFormScreen;