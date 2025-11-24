import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

const FlashcardScreen = () => {
    const { colors } = useTheme();
    const [hasError, setHasError] = useState(false);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {hasError ? (
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.text }]}>
                        Unable to load flashcards
                    </Text>
                    <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
                        Please check your internet connection
                    </Text>
                </View>
            ) : (
                <WebView
                    source={{ uri: 'https://flashcard-theta-sage.vercel.app/' }}
                    style={styles.webview}
                    startInLoadingState={true}
                    onError={() => setHasError(true)}
                    renderLoading={() => (
                        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    errorSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default FlashcardScreen;
