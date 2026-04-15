import { Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { OptionsRow, ProfileOptionsContainer } from '@/components/ui/containers/profile-options-container';
import { useState } from 'react';

export default function SettingsScreen() {
  const user = "UserName";
  const router = useRouter();

  const [notificationsOn, setNotificationsOn] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = () => {
    // your password update logic here
    setShowChangePassword(false);
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}>

        <ThemedText type="subtitle">
          Alerts
        </ThemedText>
        <ProfileOptionsContainer style={{ marginTop: 24 }}>
          <OptionsRow
            type="toggle"
            label="Enable Notifications"
            value={notificationsOn}
            onToggle={setNotificationsOn}
          />
        </ProfileOptionsContainer>

        <ThemedText type="subtitle" style={{ marginTop: 24 }}>
          User Account
        </ThemedText>

        <ProfileOptionsContainer style={{ marginTop: 24 }}>
          <OptionsRow
            type="navigation"
            label="Height"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Age"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Sex"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Date of Birth"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Language"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Units of Measurement"
            onPress={() => {}}
          />
          <OptionsRow
            type="navigation"
            label="Change Password"
            onPress={() => setShowChangePassword(true)}
          />
          <OptionsRow
            type="navigation"
            label="Delete Account"
            onPress={() => router.push('/(pages)/profile/account-deletion')}
          />
        </ProfileOptionsContainer>
      </ParallaxScrollView >
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    justifyContent: 'flex-end',  // pushes sheet to bottom
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
  headerImage: {
    color: '#8B5CF6',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  scrollContainer: {
    paddingRight: 16,
    gap: 12,
  },
});
