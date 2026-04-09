import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '@/context/theme-context';

// Individual row variants
type BaseRowProps = { label: string };

type NavigationRowProps = BaseRowProps & {
  type: 'navigation';
  onPress: () => void;
};

type ControlRowProps = BaseRowProps & {
  type: 'control';
  control: React.ReactNode;
};

type SelectRowProps = BaseRowProps & {
  type: 'select';
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

type ToggleRowProps = BaseRowProps & {
  type: 'toggle';
  value: boolean;
  onToggle: (newValue: boolean) => void;
}

type RowProps = NavigationRowProps | ControlRowProps | ToggleRowProps | SelectRowProps;

function PillToggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      style={[styles.pill, value ? styles.pillOn : styles.pillOff]}
      activeOpacity={0.8}
    >
      <View style={[styles.pillThumb, value ? styles.pillThumbOn : styles.pillThumbOff]} />
    </TouchableOpacity>
  );
}


function SelectPicker({ value, options, onSelect }: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { isDark, colors } = useTheme();

  return (
    <>
      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: colors.background }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.selectButtonText, { color: colors.text }]}>{value}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item === value && { backgroundColor: colors.background }]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[styles.optionText, { color: colors.textMuted }, item === value && { color: colors.text, fontWeight: '600' }]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={16} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function OptionsRow(props: RowProps) {
  const { isDark, colors } = useTheme();

  const content = (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.text }]}>{props.label}</Text>
      {props.type === 'navigation' ? (
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      ) : props.type === 'toggle' ? (
        <PillToggle value={props.value} onToggle={props.onToggle} />
      ) : props.type === 'select' ? (
        <SelectPicker
          value={props.value}
          options={props.options}
          onSelect={props.onSelect}
        />
      ) : (
        props.control
      )}
    </View>
  );

  if (props.type === 'navigation') {
    return (
      <TouchableOpacity onPress={props.onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// The card wrapper
type ProfileOptionsContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ProfileOptionsContainer({ children, style }: ProfileOptionsContainerProps) {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
  },

  pill: {
    width: 52,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  pillOn: {
    backgroundColor: '#8B5CF6',
  },
  pillOff: {
    backgroundColor: '#555',
  },
  pillThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
  },
  pillThumbOn: {
    alignSelf: 'flex-end',
  },
  pillThumbOff: {
    alignSelf: 'flex-start',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  selectButtonText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 300,
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 15,
  },
});
