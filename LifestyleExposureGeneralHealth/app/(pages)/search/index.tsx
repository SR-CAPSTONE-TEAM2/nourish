import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  View,
  TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Chemical = {
  id: string;
  dtxsid: string;
  preferred_name: string;
  casrn: string | null;
  molecular_formula: string | null;
  category: string[] | null;
  source_tags: string[] | null;
};

type Pesticide = {
  id: number;
  name: string;
  cas_number: string | null;
  pesticide_type: string | null;
  primary_concern: string | null;
  commonly_found_on: string[] | null;
};

type SearchResult =
  | { type: 'chemical'; data: Chemical }
  | { type: 'pesticide'; data: Pesticide };

export default function SearchScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    setExpanded(null);

    const searchPattern = `%${trimmed}%`;

    const [chemicalsRes, pesticidesRes] = await Promise.all([
      supabase
        .from('chemicals')
        .select('id, dtxsid, preferred_name, casrn, molecular_formula, category, source_tags')
        .or(`preferred_name.ilike.${searchPattern},casrn.ilike.${searchPattern},dtxsid.ilike.${searchPattern}`)
        .limit(20),
      supabase
        .from('pesticides')
        .select('id, name, cas_number, pesticide_type, primary_concern, commonly_found_on')
        .or(`name.ilike.${searchPattern},cas_number.ilike.${searchPattern}`)
        .limit(20),
    ]);

    const combined: SearchResult[] = [
      ...(chemicalsRes.data ?? []).map((c) => ({ type: 'chemical' as const, data: c })),
      ...(pesticidesRes.data ?? []).map((p) => ({ type: 'pesticide' as const, data: p })),
    ];

    setResults(combined);
    setLoading(false);
  };

  const getResultKey = (item: SearchResult) =>
    item.type === 'chemical' ? `c-${item.data.id}` : `p-${item.data.id}`;

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const renderChemical = (chemical: Chemical, isExpanded: boolean) => (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.badge, { backgroundColor: '#0a7ea4' }]}>
          <ThemedText style={styles.badgeText}>Chemical</ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.resultName}>
          {chemical.preferred_name}
        </ThemedText>
      </View>
      {chemical.casrn && (
        <ThemedText style={styles.resultDetail}>CAS: {chemical.casrn}</ThemedText>
      )}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <ThemedText style={styles.resultDetail}>DTXSID: {chemical.dtxsid}</ThemedText>
          {chemical.molecular_formula && (
            <ThemedText style={styles.resultDetail}>
              Formula: {chemical.molecular_formula}
            </ThemedText>
          )}
          {chemical.category && chemical.category.length > 0 && (
            <View style={styles.tagRow}>
              {chemical.category.map((cat) => (
                <View key={cat} style={[styles.tag, { backgroundColor: colors.icon + '30' }]}>
                  <ThemedText style={styles.tagText}>{cat}</ThemedText>
                </View>
              ))}
            </View>
          )}
          {chemical.source_tags && chemical.source_tags.length > 0 && (
            <View style={styles.tagRow}>
              {chemical.source_tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: '#e8910030' }]}>
                  <ThemedText style={[styles.tagText, { color: '#e89100' }]}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );

  const renderPesticide = (pesticide: Pesticide, isExpanded: boolean) => (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.badge, { backgroundColor: '#d4520a' }]}>
          <ThemedText style={styles.badgeText}>Pesticide</ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.resultName}>
          {pesticide.name}
        </ThemedText>
      </View>
      {pesticide.cas_number && (
        <ThemedText style={styles.resultDetail}>CAS: {pesticide.cas_number}</ThemedText>
      )}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {pesticide.pesticide_type && (
            <ThemedText style={styles.resultDetail}>
              Type: {pesticide.pesticide_type}
            </ThemedText>
          )}
          {pesticide.primary_concern && (
            <ThemedText style={styles.resultDetail}>
              Concern: {pesticide.primary_concern}
            </ThemedText>
          )}
          {pesticide.commonly_found_on && pesticide.commonly_found_on.length > 0 && (
            <View style={styles.tagRow}>
              {pesticide.commonly_found_on.map((item) => (
                <View key={item} style={[styles.tag, { backgroundColor: '#d4520a20' }]}>
                  <ThemedText style={[styles.tagText, { color: '#d4520a' }]}>{item}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );

  const renderItem = ({ item }: { item: SearchResult }) => {
    const key = getResultKey(item);
    const isExpanded = expanded === key;

    return (
      <TouchableOpacity
        style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.icon + '40' }]}
        onPress={() => toggleExpand(key)}
        activeOpacity={0.7}>
        {item.type === 'chemical'
          ? renderChemical(item.data as Chemical, isExpanded)
          : renderPesticide(item.data as Pesticide, isExpanded)}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Search
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Look up chemicals and pesticides
      </ThemedText>

      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.icon + '60',
            },
          ]}
          placeholder="Search by name or CAS number..."
          placeholderTextColor={colors.icon}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.tint }]}
          onPress={handleSearch}>
          <ThemedText style={styles.searchButtonText}>Go</ThemedText>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={styles.loader} size="large" color={colors.tint} />}

      {!loading && searched && results.length === 0 && (
        <ThemedText style={styles.empty}>No results found.</ThemedText>
      )}

      <FlatList
        data={results}
        keyExtractor={getResultKey}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Ubuntu_400Regular',
  },
  searchButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginTop: 30,
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    opacity: 0.5,
  },
  list: {
    paddingBottom: 40,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultName: {
    flex: 1,
  },
  resultDetail: {
    opacity: 0.7,
    fontSize: 14,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#88888840',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
