import { useState } from 'react';
import { StyleSheet, TextInput, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Markdown from 'react-native-markdown-display';

export default function AskAIScreen() {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const { isDark, colors } = useTheme();
    const router = useRouter();

    const markdownStyles = {
        body: { color: colors.text, fontSize: 16, lineHeight: 24 },
        heading1: { color: colors.text, fontSize: 28, fontWeight: 'bold' as const, marginVertical: 12 },
        heading2: { color: colors.text, fontSize: 22, fontWeight: 'bold' as const, marginVertical: 10 },
        heading3: { color: colors.text, fontSize: 18, fontWeight: 'bold' as const, marginVertical: 8 },
        strong: { color: colors.text, fontWeight: 'bold' as const },
        em: { color: colors.text, fontStyle: 'italic' as const },
        paragraph: { color: colors.text, marginBottom: 12, lineHeight: 24 },
        list_item: { color: colors.text, marginBottom: 6, lineHeight: 24 },
        bullet_list: { color: colors.text, marginBottom: 12 },
        ordered_list: { color: colors.text, marginBottom: 12 },
        link: { color: '#0a7ea4', textDecorationLine: 'underline' as const },
        code_inline: { color: colors.textSecondary, backgroundColor: colors.border, padding: 4, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
        code_block: { color: colors.textSecondary, backgroundColor: colors.border, padding: 12, borderRadius: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 12 },
        blockquote: { borderLeftColor: colors.primary, borderLeftWidth: 4, paddingLeft: 10, marginVertical: 12, opacity: 0.8 },
    };

    const submitQuery = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setResponse('');

        try {
            const { data, error } = await supabase.functions.invoke('gemini-query', {
                body: { query: query.trim() }
            });

            if (error) {
                console.error("Error calling Supabase function:", error);
                setResponse(`Sorry, there was an error processing your request. ${error.message}`);
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
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <ThemedText type="subtitle" style={styles.header}>
                            Ask AI Assistant
                        </ThemedText>
                    </View>

                    {loading ? (
                        <View style={styles.responseContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <ThemedText style={styles.loadingText}>Analyzing Data...</ThemedText>
                        </View>
                    ) : response ? (
                        <ThemedView style={[styles.responseContainer, { backgroundColor: colors.inputBackground }]}>
                            <Markdown style={markdownStyles}>
                                {response}
                            </Markdown>
                        </ThemedView>
                    ) : (
                        <View style={styles.emptyResponseSpace} />
                    )}
                </ThemedView>
            </ScrollView>

            <ThemedView style={[styles.inputContainer, { borderTopColor: colors.border }]}>
                <TextInput
                    style={[
                        styles.textInput,
                        {
                            backgroundColor: colors.inputBackground,
                            color: colors.text
                        }
                    ]}
                    placeholder="Type your medical question here..."
                    placeholderTextColor={colors.textMuted}
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
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    backButton: {
        marginRight: 10,
    },
    header: {
        marginBottom: 0,
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
