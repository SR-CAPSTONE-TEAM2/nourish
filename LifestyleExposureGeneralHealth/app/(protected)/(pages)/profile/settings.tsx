import { Stack, useRouter } from 'expo-router';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { OptionsRow, ProfileOptionsContainer } from '@/components/ui/containers/profile-options-container';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useTheme } from '@/context/theme-context';
import { supabase } from '@/lib/supabase';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Bottom-sheet modal for editing a single text field. */
function EditFieldSheet({
  visible,
  title,
  placeholder,
  value,
  onSave,
  onClose,
  keyboardType,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onSave: (v: string) => void;
  onClose: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetContainer}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>

          <Text style={styles.fieldLabel}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#666"
            value={draft}
            onChangeText={setDraft}
            keyboardType={keyboardType ?? 'default'}
            autoFocus
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              onSave(draft.trim());
              onClose();
            }}
          >
            <Text style={styles.primaryButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, refresh } = useUser();
  const { colors } = useTheme();

  // ── local state seeded from profile ────────────────────────────────────────
  const [notificationsOn, setNotificationsOn] = useState(profile?.notifications_enabled ?? false);
  const [saving, setSaving] = useState(false);

  // Modal visibility
  const [editField, setEditField] = useState<
    null | 'username' | 'first_name' | 'last_name' | 'height'
  >(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Re-sync if profile changes (e.g. after a refresh)
  useEffect(() => {
    if (profile) {
      setNotificationsOn(profile.notifications_enabled ?? false);
    }
  }, [profile]);

  // ── DB update helper ───────────────────────────────────────────────────────
  const updateProfile = async (patch: Record<string, any>) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(patch)
        .eq('user_id', user.id);

      if (error) throw error;
      await refresh();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Notifications toggle ───────────────────────────────────────────────────
  const handleToggleNotifications = (val: boolean) => {
    setNotificationsOn(val);
    updateProfile({ notifications_enabled: val });
  };

  // ── Password update ────────────────────────────────────────────────────────
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully.');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  // ── Birthday date picker handler ───────────────────────────────────────────
  const handleBirthdayChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowBirthdayPicker(false);
    if (event.type === 'dismissed') {
      setShowBirthdayPicker(false);
      return;
    }
    if (selectedDate) {
      const isoDate = selectedDate.toISOString();
      updateProfile({ birthday: isoDate });
      if (Platform.OS === 'android') setShowBirthdayPicker(false);
    }
  };

  // ── Field display values ───────────────────────────────────────────────────
  const displayHeight = profile?.height ? `${profile.height} in` : 'Not set';
  const displayBirthday = profile?.birthday
    ? new Date(profile.birthday).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not set';

  // ── Computed age ───────────────────────────────────────────────────────────
  const computedAge = (() => {
    if (!profile?.birthday) return 'Not set';
    const bday = new Date(profile.birthday);
    const today = new Date();
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
    return `${age} years`;
  })();

  // ── Derive initial values for edit modals ──────────────────────────────────
  const fieldConfig: Record<
    string,
    { title: string; placeholder: string; value: string; keyboard?: 'numeric'; column: string }
  > = {
    username: {
      title: 'Username',
      placeholder: 'Enter username',
      value: profile?.username ?? '',
      column: 'username',
    },
    first_name: {
      title: 'First Name',
      placeholder: 'Enter first name',
      value: profile?.first_name ?? '',
      column: 'first_name',
    },
    last_name: {
      title: 'Last Name',
      placeholder: 'Enter last name',
      value: profile?.last_name ?? '',
      column: 'last_name',
    },
    height: {
      title: 'Height (inches)',
      placeholder: 'e.g. 70',
      value: profile?.height?.toString() ?? '',
      keyboard: 'numeric',
      column: 'height',
    },

  };

  const activeField = editField ? fieldConfig[editField] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ParallaxScrollView headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}>
        {saving && (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <ActivityIndicator size="small" color="#8B5CF6" />
          </View>
        )}

        {/* ── Alerts ────────────────────────────────────────────────── */}
        <ThemedText type="subtitle">Alerts</ThemedText>
        <ProfileOptionsContainer style={{ marginTop: 24 }}>
          <OptionsRow
            type="toggle"
            label="Enable Notifications"
            value={notificationsOn}
            onToggle={handleToggleNotifications}
          />
        </ProfileOptionsContainer>

        {/* ── Personal Information ───────────────────────────────────── */}
        <ThemedText type="subtitle" style={{ marginTop: 24 }}>
          Personal Information
        </ThemedText>

        <ProfileOptionsContainer style={{ marginTop: 24 }}>
          <OptionsRow
            type="navigation"
            label={`Username: ${profile?.username ?? 'Not set'}`}
            onPress={() => setEditField('username')}
          />
          <OptionsRow
            type="navigation"
            label={`First Name: ${profile?.first_name ?? 'Not set'}`}
            onPress={() => setEditField('first_name')}
          />
          <OptionsRow
            type="navigation"
            label={`Last Name: ${profile?.last_name ?? 'Not set'}`}
            onPress={() => setEditField('last_name')}
          />
          <OptionsRow
            type="navigation"
            label={`Height: ${displayHeight}`}
            onPress={() => setEditField('height')}
          />
          <OptionsRow
            type="navigation"
            label={`Date of Birth: ${displayBirthday}`}
            onPress={() => setShowBirthdayPicker(true)}
          />
          <OptionsRow
            type="control"
            label={`Age: ${computedAge}`}
            control={null}
          />
        </ProfileOptionsContainer>

        {/* ── Account ───────────────────────────────────────────────── */}
        <ThemedText type="subtitle" style={{ marginTop: 24 }}>
          Account
        </ThemedText>

        <ProfileOptionsContainer style={{ marginTop: 24 }}>
          <OptionsRow
            type="navigation"
            label="Change Password"
            onPress={() => setShowChangePassword(true)}
          />
        </ProfileOptionsContainer>
      </ParallaxScrollView>

      {/* ── Birthday Date Picker ─────────────────────────────────── */}
      {/* Android: native dialog */}
      {showBirthdayPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={profile?.birthday ? new Date(profile.birthday) : new Date(2000, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={handleBirthdayChange}
        />
      )}

      {/* iOS: spinner in bottom-sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showBirthdayPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBirthdayPicker(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowBirthdayPicker(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Date of Birth</Text>
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <DateTimePicker
                  value={profile?.birthday ? new Date(profile.birthday) : new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={handleBirthdayChange}
                  textColor="#fff"
                  style={{ width: '100%', height: 180 }}
                />
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowBirthdayPicker(false)}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Web: HTML date input in bottom-sheet modal */}
      {Platform.OS === 'web' && (
        <Modal
          visible={showBirthdayPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBirthdayPicker(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowBirthdayPicker(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Date of Birth</Text>
              <input
                type="date"
                value={profile?.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '2000-01-01'}
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
                onChange={(e: any) => {
                  const val = e.target.value;
                  if (val) {
                    updateProfile({ birthday: new Date(val).toISOString() });
                  }
                }}
                style={{
                  width: '100%',
                  padding: 14,
                  fontSize: 16,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  marginTop: 8,
                  marginBottom: 16,
                  fontFamily: "'DM Sans', sans-serif",
                  colorScheme: 'dark',
                }}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowBirthdayPicker(false)}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Edit Field Bottom Sheet ──────────────────────────────── */}
      {activeField && (
        <EditFieldSheet
          visible={!!editField}
          title={activeField.title}
          placeholder={activeField.placeholder}
          value={activeField.value}
          keyboardType={activeField.keyboard ?? 'default'}
          onClose={() => setEditField(null)}
          onSave={(val) => {
            if (!val) return;
            const patch: Record<string, any> = {};
            if (activeField.keyboard === 'numeric') {
              patch[activeField.column] = parseFloat(val);
            } else {
              patch[activeField.column] = val;
            }
            updateProfile(patch);
          }}
        />
      )}

      {/* ── Change Password Bottom Sheet ─────────────────────────── */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowChangePassword(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Change Password</Text>

            <Text style={styles.fieldLabel}>Current password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor="#666"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#666"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#666"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleUpdatePassword}>
              <Text style={styles.primaryButtonText}>Update Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowChangePassword(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  sheet: {
    backgroundColor: '#2C2C3E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 20,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
});
