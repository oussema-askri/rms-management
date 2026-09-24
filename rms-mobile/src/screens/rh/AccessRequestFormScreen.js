import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/axios';
import { COLORS } from '../../constants/config';
import { LoadingSpinner } from '../../components/common';
import { formatDateForInput } from '../../utils/formatters';

const AccessRequestFormScreen = ({ route, navigation }) => {
  const { requestId } = route.params || {};
  const isEditing = !!requestId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [missionDate, setMissionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');
  const [bateau, setBateau] = useState('');

  // Employees for selector
  const [employees, setEmployees] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorIndex, setSelectorIndex] = useState(null);

  // Workers
  const [workers, setWorkers] = useState([{ name: '', cin: '' }]);

  // Vehicle
  const [vehicles, setVehicles] = useState([{ type: '', matricule: '' }]);

  // Materiels
  const [materiels, setMateriels] = useState('');
  const [distinctMateriels, setDistinctMateriels] = useState([]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/rh/employees');
      const data = response.data?.data || [];
      setEmployees(data.filter(
        emp => emp.isAvailable !== false && ['employer', 'responsable'].includes(emp.role)
      ));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDistinctMateriels = async () => {
    try {
      const res = await api.get('/planning/materiels/distinct');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setDistinctMateriels(data);
      }
    } catch (e) {
      console.warn('Error fetching materiels:', e.message);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDistinctMateriels();
    if (isEditing) {
      fetchRequest();
    }
  }, [requestId]);

  const openSelector = (index) => {
    setSelectorIndex(index);
    setSelectorOpen(true);
  };

  const selectEmployee = (emp) => {
    const newWorkers = [...workers];
    newWorkers[selectorIndex] = { name: emp.name, cin: emp.cin };
    setWorkers(newWorkers);
    setSelectorOpen(false);
    setSelectorIndex(null);
  };

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/rh/access-requests/${requestId}`);
      const request = response.data.data || response.data;

      setMissionDate(new Date(request.missionDate));
      setLocation(request.location || '');
      setDuration(request.duration || '');
      setPurpose(request.purpose || '');
      setBateau(request.bateau || '');
      setMateriels(request.materiels || '');
      setWorkers(request.workers && request.workers.length > 0 ? request.workers : [{ name: '', cin: '' }]);

      if (request.vehicles && request.vehicles.length > 0) {
        setVehicles(request.vehicles);
      } else if (request.vehicle) {
        setVehicles([request.vehicle]); // Fallback for old data
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      Alert.alert('Erreur', 'Impossible de charger la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialClick = (mat) => {
    setMateriels(prev => {
      const current = prev ? prev.trim() : '';
      return current ? `${current}\n${mat}` : mat;
    });
  };

  const addVehicle = () => setVehicles([...vehicles, { type: '', matricule: '' }]);
  
  const removeVehicle = (index) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const updateVehicle = (index, field, value) => {
    const newVehicles = [...vehicles];
    newVehicles[index][field] = value;
    setVehicles(newVehicles);
  };

  const addWorker = () => {
    setWorkers([...workers, { name: '', cin: '' }]);
  };

  const removeWorker = (index) => {
    if (workers.length > 1) {
      const newWorkers = workers.filter((_, i) => i !== index);
      setWorkers(newWorkers);
    }
  };

  const updateWorker = (index, field, value) => {
    const newWorkers = [...workers];
    newWorkers[index][field] = value;
    setWorkers(newWorkers);
  };

  const validateForm = () => {
    if (!location.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le lieu');
      return false;
    }
    if (!purpose.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer l\'objet de la mission');
      return false;
    }
    if (!duration.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer la durée');
      return false;
    }
    if (!bateau.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du bateau');
      return false;
    }

    // Validate workers
    const validWorkers = workers.filter(w => w.name.trim() && w.cin.trim());
    if (validWorkers.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un travailleur');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Filter out empty workers
      const validWorkers = workers.filter(w => w.name.trim() && w.cin.trim());

      const data = {
        missionDate: formatDateForInput(missionDate),
        location: location.trim(),
        duration: duration.trim(),
        purpose: purpose.trim(),
        bateau: bateau.trim(),
        materiels: materiels.trim(),
        workers: validWorkers,
        vehicles: vehicles.filter(v => v.type.trim() || v.matricule.trim()),
      };

      if (isEditing) {
        await api.put(`/rh/access-requests/${requestId}`, data);
        Alert.alert('Succès', 'Demande modifiée avec succès');
      } else {
        await api.post('/rh/access-requests', data);
        Alert.alert('Succès', 'Demande créée avec succès');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de sauvegarder la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setMissionDate(selectedDate);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Informations de la Mission</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date de la Mission *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>📅 {missionDate.toLocaleDateString('fr-FR')}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={missionDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Lieu *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Ex: Chantier A, Tunis"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Durée *</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="Ex: 3 jours, 1 semaine"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Objet de la Mission *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Décrivez l'objet de la mission"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bateau *</Text>
          <TextInput
            style={styles.input}
            value={bateau}
            onChangeText={setBateau}
            placeholder="Ex: M/V Atlantic Star"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Matériels Nécessaires</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={materiels}
            onChangeText={setMateriels}
            placeholder="Ex: Caisses à outils, EPI..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {distinctMateriels.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyLabel}>Matériels fréquents :</Text>
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
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👷 Travailleurs</Text>
          <TouchableOpacity style={styles.addButton} onPress={addWorker}>
            <Text style={styles.addButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {workers.map((worker, index) => (
          <View key={index} style={styles.workerCard}>
            <View style={styles.workerHeader}>
              <Text style={styles.workerNumber}>Travailleur {index + 1}</Text>
              {workers.length > 1 && (
                <TouchableOpacity onPress={() => removeWorker(index)}>
                  <Text style={styles.removeBtn}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>

            {employees.length > 0 && (
              <TouchableOpacity
                style={styles.employeeSelectBtn}
                onPress={() => openSelector(index)}
              >
                <Text style={styles.employeeSelectBtnText}>
                  👤 Sélectionner un employé
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom Complet *</Text>
              <TextInput
                style={styles.input}
                value={worker.name}
                onChangeText={(value) => updateWorker(index, 'name', value)}
                placeholder="Nom et prénom"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>CIN *</Text>
              <TextInput
                style={styles.input}
                value={worker.cin}
                onChangeText={(value) => updateWorker(index, 'cin', value)}
                placeholder="Numéro CIN"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚗 Véhicules</Text>
          <TouchableOpacity style={styles.addButton} onPress={addVehicle}>
            <Text style={styles.addButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {vehicles.map((v, index) => (
          <View key={index} style={styles.workerCard}>
            <View style={styles.workerHeader}>
              <Text style={styles.workerNumber}>Véhicule {index + 1}</Text>
              {vehicles.length > 1 && (
                <TouchableOpacity onPress={() => removeVehicle(index)}>
                  <Text style={styles.removeBtn}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de Véhicule</Text>
              <TextInput
                style={styles.input}
                value={v.type}
                onChangeText={(val) => updateVehicle(index, 'type', val)}
                placeholder="Ex: Camionnette, Voiture"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Matricule</Text>
              <TextInput
                style={styles.input}
                value={v.matricule}
                onChangeText={(val) => updateVehicle(index, 'matricule', val)}
                placeholder="Ex: 123 TU 4567"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
        ))}
      </View>

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

    {/* Employee selector modal */}
    <Modal
      visible={selectorOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectorOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un employé</Text>
            <TouchableOpacity onPress={() => setSelectorOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={employees}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.empItem}
                onPress={() => selectEmployee(item)}
              >
                <Text style={styles.empName}>{item.name}</Text>
                <Text style={styles.empCin}>CIN: {item.cin}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.empSeparator} />}
            ListEmptyComponent={
              <Text style={styles.empEmpty}>Aucun employé disponible</Text>
            }
          />
        </View>
      </View>
    </Modal>
    </>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    height: 100,
    paddingTop: 14,
  },
  dateButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 15,
    color: COLORS.text,
  },
  workerCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  employeeSelectBtn: {
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  employeeSelectBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textLight,
    padding: 4,
  },
  empItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  empName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  empCin: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  empSeparator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 16,
  },
  empEmpty: {
    padding: 24,
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workerNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  removeBtn: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
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

export default AccessRequestFormScreen;
