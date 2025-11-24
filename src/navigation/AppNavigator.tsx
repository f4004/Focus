import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import TimerScreen from '../screens/TimerScreen';
import HabitScreen from '../screens/HabitScreen';
import FlashcardScreen from '../screens/FlashcardScreen';
import { Clock, Calendar, BookOpen, Moon, Sun } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const CustomHeader = () => {
    const { theme, toggleTheme, colors } = useTheme();

    return (
        <View style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Focus & Habits</Text>
            <TouchableOpacity onPress={toggleTheme} style={[styles.themeButton, { backgroundColor: colors.surface }]}>
                {theme === 'dark' ? (
                    <Moon size={20} color={colors.text} />
                ) : (
                    <Sun size={20} color={colors.text} />
                )}
            </TouchableOpacity>
        </View>
    );
};

const AppNavigator = () => {
    const { colors } = useTheme();

    return (
        <NavigationContainer>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {/* CustomHeader removed */}
                <Tab.Navigator
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                        },
                        tabBarActiveTintColor: colors.primary,
                        tabBarInactiveTintColor: colors.textSecondary,
                    }}
                >
                    <Tab.Screen
                        name="Timer"
                        component={TimerScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />
                        }}
                    />
                    <Tab.Screen
                        name="Habits"
                        component={HabitScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />
                        }}
                    />
                    <Tab.Screen
                        name="Flashcards"
                        component={FlashcardScreen}
                        options={{
                            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />
                        }}
                    />
                </Tab.Navigator>
            </View>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        paddingTop: 50, // Status bar padding
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    themeButton: {
        padding: 8,
        borderRadius: 20,
    },
});

export default AppNavigator;
