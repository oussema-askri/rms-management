import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/config';

const PickerSelect = ({
  label,
  value,
  options = [],
  onValueChange,
  placeholder = 'Sélectionner...',
  required = false,
  error,
  disabled = false,
  labelKey = 'label',
  valueKey = 'value',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Find selected option
  const getSelectedOption = () => {
    if (!value) return null;
    return options.find(opt => {
      const optValue = opt[valueKey];
      return optValue === value || String(optValue) === String(value);
    });
  };

  const selectedOption = getSelectedOption();
  const displayText = selectedOption ? selectedOption[labelKey] : placeholder;

  const handleSelect = (option) => {
    const newValue = option[valueKey];
    setModalVisible(false);
    setTimeout(() => {
      onValueChange(newValue);
    }, 100);
  };

  const openModal = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const isSelected = (option) => {
    const optValue = option[valueKey];
    return optValue === value || String(optValue) === String(value);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          disabled && styles.pickerDisabled,
        ]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <SafeAreaView style={styles.modalInner} edges={['bottom']}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label || 'Sélectionner'}</Text>
                <TouchableOpacity 
                  onPress={closeModal}
                  style={styles.closeButtonContainer}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Options List */}
              {options.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucune option disponible</Text>
                </View>
              ) : (
                <FlatList
                  data={options}
                  keyExtractor={(item, index) => `${item[valueKey]}-${index}`}
                  renderItem={({ item }) => {
                    const selected = isSelected(item);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.option,
                          selected && styles.optionSelected,
                        ]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {item[labelKey]}
                        </Text>
                        {selected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  pickerError: {
    borderColor: COLORS.danger,
  },
  pickerDisabled: {
    backgroundColor: COLORS.background,
    opacity: 0.7,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  arrow: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: 200,
  },
  modalInner: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButtonContainer: {
    padding: 4,
  },
  closeButton: {
    fontSize: 22,
    color: COLORS.textLight,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
});

export default PickerSelect;