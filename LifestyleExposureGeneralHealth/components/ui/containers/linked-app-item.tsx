import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

type LinkedAppItemProps = {
  name: string;
  icon: { uri: string } | number;
  linkedAccount?: string;
  connectedLabel?: string;
  onLink: () => void;
  onUnlink: () => void;
  style?: ViewStyle;
};

export function LinkedAppItem({ name, icon, linkedAccount, connectedLabel, onLink, onUnlink, style }: LinkedAppItemProps) {
  const isLinked = !!linkedAccount;

  return (
    <View style={[styles.card, style]}>
      <Image source={icon} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.appName}>{name}</Text>
        {isLinked ? (
          <>
            <Text style={styles.accountLabel}>
              {connectedLabel ? 'Status :' : 'Linked Account:'}
            </Text>
            <Text style={styles.accountEmail}>
              {connectedLabel ?? linkedAccount}
            </Text>
          </>
        ) : (
          <Text style={styles.accountLabel}>Tap to link your account</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.button, isLinked ? styles.unlinkButton : styles.linkButton]}
        onPress={isLinked ? onUnlink : onLink}
      >
        <Text style={[styles.buttonText, isLinked && styles.unlinkButtonText]}>
          {isLinked ? 'Unlink' : 'Link'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  appName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountLabel: {
    color: '#6B6B8A',
    fontSize: 14,
  },
  accountEmail: {
    color: 'white',
    fontSize: 14,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButton: {
    backgroundColor: '#8B5CF6',
  },
  unlinkButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B6B8A',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
  },
  unlinkButtonText: {
    color: '#aaa',
  },
});
