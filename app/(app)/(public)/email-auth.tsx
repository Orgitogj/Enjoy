import PressableScale from '@/components/ui/PressableScale';
import { createThemedStyles, Fonts, useThemeColors } from '@/constants/theme';
import useAuthStore from '@/hooks/use-auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

const Page = () => {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const colors = useThemeColors();
  const styles = useStyles();
  const inputStyle = (field: 'name' | 'email' | 'password') => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    if (mode === 'signin') {
      const { error: authError } = await signInWithEmail(email.trim(), password);
      setIsSubmitting(false);
      if (authError) setError(authError);
      return;
    }

    const { error: authError, needsEmailConfirmation } = await signUpWithEmail(
      email.trim(),
      password,
      fullName.trim() || undefined
    );
    setIsSubmitting(false);

    if (authError) {
      setError(authError);
      return;
    }

    if (needsEmailConfirmation) {
      setInfoMessage('Account created! Check your email to confirm it, then log in.');
      setMode('signin');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.dismiss()}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={4}>
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title} accessibilityRole="header">{mode === 'signin' ? 'Log in' : 'Create account'}</Text>

      {mode === 'signup' && (
        <TextInput
          style={inputStyle('name')}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Full name"
          autoComplete="name"
          textContentType="name"
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailInput.current?.focus()}
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        ref={emailInput}
        style={inputStyle('email')}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Email"
        autoComplete="email"
        textContentType="emailAddress"
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField(null)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordInput.current?.focus()}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        ref={passwordInput}
        style={inputStyle('password')}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField(null)}
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        value={password}
        onChangeText={setPassword}
      />

      {infoMessage && (
        <Text style={styles.infoText} accessibilityLiveRegion="polite">
          {infoMessage}
        </Text>
      )}
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={15} color={colors.danger} /> {error}
        </Text>
      )}

      <PressableScale
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={mode === 'signin' ? 'Log in' : 'Create account'}
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === 'signin' ? 'Log in' : 'Create account'}
          </Text>
        )}
      </PressableScale>

      <TouchableOpacity
        style={styles.switchModeButton}
        accessibilityRole="button"
        onPress={() => {
          setError(null);
          setMode(mode === 'signin' ? 'signup' : 'signin');
        }}>
        <Text style={styles.switchModeText}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Page;

const useStyles = createThemedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 14,
    paddingBottom: 32,
  },
  closeBtn: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 40,
    padding: 8,
    alignSelf: 'flex-end',
    marginRight: 20,
  },
  title: {
    fontSize: 30,
    fontFamily: Fonts.brandBlack,
    color: c.textPrimary,
    marginVertical: 22,
    paddingHorizontal: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
    marginBottom: 12,
    marginHorizontal: 6,
  },
  inputFocused: {
    borderColor: c.focus,
  },
  infoText: {
    color: c.success,
    fontSize: 14,
    marginBottom: 12,
    marginHorizontal: 6,
  },
  errorText: {
    color: c.danger,
    fontSize: 14,
    marginBottom: 12,
    marginHorizontal: 6,
  },
  submitButton: {
    backgroundColor: c.primary,
    minHeight: 54,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: c.primaryPressed,
  },
  submitButtonText: {
    color: c.primaryForeground,
    fontSize: 18,
    fontFamily: Fonts.brandBold,
  },
  switchModeButton: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModeText: {
    color: c.link,
    fontSize: 15,
    fontFamily: Fonts.brandBold,
  },
}));
