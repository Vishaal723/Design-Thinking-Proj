import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login } = useApp();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.appName}>MacroCloud</Text>
          <Text style={styles.tagline}>AI-powered meals for your physique goals</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to continue</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Get Started →</Text>
            }
          </TouchableOpacity>

          <Text style={styles.hint}>New user? An account is created automatically.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.brand, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: fontSize.xxxl, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  tagline: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, marginBottom: spacing.md, height: 52,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  error: {
    color: colors.error, fontSize: fontSize.sm,
    marginBottom: spacing.sm, textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.brand, borderRadius: radius.full,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  hint: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.md },
});
