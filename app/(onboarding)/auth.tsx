import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '@constants/Colors';
import { Shadows, Typography, Spacing, BorderRadius } from '@constants/Colors';
import { useAuth } from '@contexts/AuthContext';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, signup, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    // Clear previous errors
    setError('');

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, displayName);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      // Success - navigate to home
      router.replace('/(tabs)/home');
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(''); // Clear errors when switching modes
  };

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  const isFormValid = email.trim() && password.trim() && (isLogin || displayName.trim());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
          </TouchableOpacity>
          <Image
            source={require('../../src/assets/images/image.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Browse as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <Image
            source={require('../../src/assets/images/image.png')}
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Join Hustl'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to your account' : 'Create your account to get started'}
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={Colors.muted.foreground}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.muted.foreground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.muted.foreground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.muted.foreground} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={Colors.muted.foreground} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isFormValid || isLoading) && styles.disabledButton
            ]}
            onPress={handleAuth}
            disabled={!isFormValid || isLoading}
          >
            <Text style={[
              styles.primaryButtonText,
              (!isFormValid || isLoading) && styles.disabledButtonText
            ]}>
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={toggleAuthMode}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
  authLogo: {
    width: 72,
    height: 72,
  },
  skipText: {
    ...Typography.labelMedium,
    color: Colors.semantic.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },
  authHeader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  title: {
    ...Typography.displayMedium,
    color: Colors.semantic.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.semantic.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.semantic.error + '10',
    borderWidth: 1,
    borderColor: Colors.semantic.error + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.semantic.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    gap: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.labelMedium,
    color: Colors.semantic.textPrimary,
  },
  input: {
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
    ...Shadows.small,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: BorderRadius.lg,
    ...Shadows.small,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    ...Typography.bodyMedium,
    color: Colors.semantic.textPrimary,
  },
  eyeButton: {
    padding: Spacing.lg,
  },
  buttonContainer: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },
  primaryButton: {
    backgroundColor: Colors.semantic.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.medium,
  },
  primaryButtonText: {
    ...Typography.labelLarge,
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.gray300,
  },
  disabledButtonText: {
    color: Colors.gray500,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.labelLarge,
    color: Colors.semantic.textPrimary,
  },
});