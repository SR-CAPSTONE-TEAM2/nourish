import { View, FlatList, StyleSheet } from 'react-native';
import { useState } from 'react';
import AppleHealthKit from 'react-native-health';
import { Platform } from 'react-native';
import { LinkedAppItem } from '@/components/ui/containers/linked-app-item';
import { ThemedText } from '@/components/themed-text';

export default function AccountDeletionScreen() {

  return (
    <View>
      <ThemedText type="title" style={{ marginTop: 24, marginLeft: 24 }}>
        Delete Account
      </ThemedText>

      <ThemedText style={{ margin: 24 }}>
        The proceeding by tapping the confirmation button below will permanently
        delete all meals, journal entries, conversations, diagnostics,
        linked apps tied to your account and stored on the app. The following action is
        not reversible.

      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  addButton: {
    alignSelf: 'center',
    backgroundColor: '#8B5CF6',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  list: {
    gap: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    gap: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    color: '#6B6B8A',
    fontSize: 15,
  },
  modalClose: {
    marginTop: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
