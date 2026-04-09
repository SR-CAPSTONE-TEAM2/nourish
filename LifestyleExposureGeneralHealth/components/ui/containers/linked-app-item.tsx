import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/theme-context';

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
  const { isDark, colors } = useTheme();
  const isLinked = !!linkedAccount;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <Image source={icon} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={[styles.appName, { color: colors.text }]}>{name}</Text>
        {isLinked ? (
          <>
            <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
              {connectedLabel ? 'Status :' : 'Linked Account:'}
            </Text>
            <Text style={[styles.accountEmail, { color: colors.text }]}>
              {connectedLabel ?? linkedAccount}
            </Text>
          </>
        ) : (
          <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Tap to link your account</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.button, isLinked ? [styles.unlinkButton, { borderColor: colors.textMuted }] : styles.linkButton]}
        onPress={isLinked ? onUnlink : onLink}
      >
        <Text style={[styles.buttonText, isLinked && { color: colors.textSecondary }]}>
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
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountLabel: {
    fontSize: 14,
  },
  accountEmail: {
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
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'black',
  },
});
