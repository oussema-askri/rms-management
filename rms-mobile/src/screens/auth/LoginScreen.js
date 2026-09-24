import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/config';
import { MaterialIcons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password, rememberMe);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Erreur de connexion', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Main Card Content */}
          <View style={styles.cardBody}>
            {/* Logo box */}
            <View style={styles.logoBox}>
              <Image source={require('../../../assets/mini-logo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>

            <Text style={styles.cardTitle}>Bienvenue sur RMS</Text>
            <Text style={styles.cardSubtitle}>RIYADA Management & Services</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="mail" size={20} color="#4B5563" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="nom@entreprise.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>MOT DE PASSE</Text>
                <TouchableOpacity onPress={() => Alert.alert('Mot de passe oublié', 'Veuillez contacter l\'administrateur pour réinitialiser votre mot de passe.')}>
                  <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="#4B5563" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <MaterialIcons name="check" size={14} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Se souvenir de moi</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <View style={styles.loginBtnContent}>
                  <Text style={styles.loginButtonText}>Se connecter  </Text>
                  <MaterialIcons name="login" size={20} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#003664', // Deep nautical navy
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fbf9f5', // "Base Layer" surface as described in DESIGN.md
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
    marginTop: 20,
  },
  cardBody: {
    padding: 32,
    alignItems: 'center',
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#003664',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'San Francisco' : 'sans-serif',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 32,
    fontWeight: '400',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003664',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6e3da', // No outline rule per DESIGN.md
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1b1c1a',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#003664',
    borderColor: '#003664',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#1b1c1a',
    fontWeight: '400',
  },
  forgotPassword: {
    fontSize: 13,
    color: '#785A00', // Brass color
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#785A00', // The Brass CTA
    borderRadius: 12, // Section 5: large radius 12px
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#785A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#A0AAB5',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoginScreen;
