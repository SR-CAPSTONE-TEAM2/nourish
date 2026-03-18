import { useState } from 'react';
import { StyleSheet, TextInput, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function AskAIScreen() {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const theme = useColorScheme() ?? 'light';

    const submitQuery = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResponse('');

        try {
            const url = __DEV__
                ? 'http://127.0.0.1:54321/functions/v1/gemini-query'
                : undefined;

            // Note: If url is provided, it must be the full URL, otherwise invoke() will use EXPO_PUBLIC_SUPABASE_URL.
            const res = await fetch(url || `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ query: query.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error calling Supabase function:", data);
                setResponse("Sorry, there was an error processing your request.");
            } else if (data && data.message) {
                setResponse(data.message);
            } else {
                setResponse("Received an unexpected response format from the server.");
            }
        } catch (error) {
            console.error("Exception when calling Supabase function:", error);
            setResponse("Network error or function unavailable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedView style={styles.content}>
                    <ThemedText type="subtitle" style={styles.header}>
                        Ask AI Assistant
                    </ThemedText>

                    {loading ? (
                        <View style={styles.responseContainer}>
                            <ActivityIndicator size="large" color={theme === 'light' ? '#0a7ea4' : '#2f95dc'} />
                            <ThemedText style={styles.loadingText}>Analyzing research...</ThemedText>
                        </View>
                    ) : response ? (
                        <ThemedView style={[styles.responseContainer, { backgroundColor: theme === 'light' ? '#f0f0f0' : '#2a2a2a' }]}>
                            <ThemedText style={styles.responseText}>{response}</ThemedText>
                        </ThemedView>
                    ) : (
                        <View style={styles.emptyResponseSpace} />
                    )}
                </ThemedView>
            </ScrollView>

            <ThemedView style={[styles.inputContainer, { borderTopColor: theme === 'light' ? '#e0e0e0' : '#333' }]}>
                <TextInput
                    style={[
                        styles.textInput,
                        {
                            backgroundColor: theme === 'light' ? '#f0f0f0' : '#2a2a2a',
                            color: theme === 'light' ? '#11181C' : '#ECEDEE'
                        }
                    ]}
                    placeholder="Type your medical question here..."
                    placeholderTextColor={theme === 'light' ? '#888' : '#aaa'}
                    value={query}
                    onChangeText={setQuery}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { opacity: query.trim().length === 0 ? 0.5 : 1 }
                    ]}
                    onPress={submitQuery}
                    disabled={query.trim().length === 0 || loading}
                >
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 10,
    },
    description: {
        marginBottom: 30,
        opacity: 0.8,
    },
    responseContainer: {
        padding: 20,
        borderRadius: 12,
        marginTop: 20,
        minHeight: 150,
        justifyContent: 'center',
    },
    responseText: {
        lineHeight: 24,
    },
    loadingText: {
        marginTop: 15,
        textAlign: 'center',
        opacity: 0.7,
    },
    emptyResponseSpace: {
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#0a7ea4',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
