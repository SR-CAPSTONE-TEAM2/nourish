import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

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

  return (
    <>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.selectButtonText}>{value}</Text>
        <Ionicons name="chevron-down" size={14} color="white" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item === value && styles.optionSelected]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>
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
  const content = (
    <View style={styles.row}>
      <Text style={styles.label}>{props.label}</Text>
      {props.type === 'navigation' ? (
        <Ionicons name="chevron-forward" size={18} color="white" />
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
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    color: 'white',
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
    backgroundColor: '#0A0A12',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: '#0A0A12',
  },
  optionText: {
    color: '#6B6B8A',
    fontSize: 15,
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});
