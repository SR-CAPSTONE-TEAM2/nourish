import { View, FlatList, StyleSheet } from 'react-native';
import { useState } from 'react';
import AppleHealthKit from 'react-native-health';
import { Platform } from 'react-native';
import { LinkedAppItem } from '@/components/ui/containers/linked-app-item';

const SUPPORTED_LINKED_APPS = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: require('@/assets/images/apple-health-app-logo.jpg'),
    platform: 'ios',
    connectedLabel: 'Connected',
  },
  {
    id: 'health_connect',
    name: 'Health Connect',
    icon: require('@/assets/images/health-connect-app-logo.png'),
    platform: 'android',
    connectedLabel: 'Connected',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: require('@/assets/images/garmin_connect_app_logo.png'),
    platform: 'both',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: require('@/assets/images/garmin_connect_app_logo.png'),
    platform: 'both',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: require('@/assets/images/garmin_connect_app_logo.png'),
    platform: 'both',
  },

];

export default function LinkedAppsScreen() {
  const [linkedAccounts, setLinkedAccounts] = useState<Record<string, string>>({
    garmin: 'account@gmail.com',
  });

  function handleLink(id: string) {
    if (id === 'apple_health' && Platform.OS === 'ios') {
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.Steps,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          ],
          write: [],
        },
      };
      AppleHealthKit.initHealthKit(permissions, (error) => {
        if (!error) {
          setLinkedAccounts((prev) => ({ ...prev, [id]: 'Apple Health' }));
        }
      });
    } else {
      // OAuth flow for other apps
      setLinkedAccounts((prev) => ({ ...prev, [id]: 'account@gmail.com' }));
    }
  }
  function handleUnlink(id: string) {
    setLinkedAccounts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }

  return (
    <View style={styles.container}>
      {/* App list */}
      <FlatList
        data={SUPPORTED_LINKED_APPS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LinkedAppItem
            name={item.name}
            icon={item.icon}
            linkedAccount={linkedAccounts[item.id]}
            connectedLabel={item.connectedLabel}
            onLink={() => handleLink(item.id)}
            onUnlink={() => handleUnlink(item.id)}
          />
        )}
      />
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
