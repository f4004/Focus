import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface TimePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (minutes: number) => void;
    currentMinutes: number;
    colors: any;
}

// Generate time options: 1, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120
const TIME_OPTIONS = [
    1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    70, 80, 90, 100, 110, 120
];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
    visible,
    onClose,
    onSelect,
    currentMinutes,
    colors
}) => {
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible && flatListRef.current) {
            // Find closest time option to current
            const closestIndex = TIME_OPTIONS.reduce((prev, curr, idx) => {
                return Math.abs(curr - currentMinutes) < Math.abs(TIME_OPTIONS[prev] - currentMinutes) ? idx : prev;
            }, 0);

            // Scroll to closest option
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: closestIndex,
                    animated: false,
                    viewPosition: 0.5
                });
            }, 100);
        }
    }, [visible, currentMinutes]);

    const handleSelect = (minutes: number) => {
        onSelect(minutes);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={[styles.pickerContainer, { backgroundColor: colors.surface }]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Set Timer</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={TIME_OPTIONS}
                        keyExtractor={(item) => item.toString()}
                        showsVerticalScrollIndicator={true}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.timeOption,
                                    item === currentMinutes && {
                                        backgroundColor: colors.primary + '20'
                                    }
                                ]}
                                onPress={() => handleSelect(item)}
                            >
                                <Text style={[
                                    styles.timeText,
                                    {
                                        color: item === currentMinutes ? colors.primary : colors.text,
                                        fontWeight: item === currentMinutes ? 'bold' : 'normal'
                                    }
                                ]}>
                                    {item} min
                                </Text>
                            </TouchableOpacity>
                        )}
                        getItemLayout={(data, index) => ({
                            length: 60,
                            offset: 60 * index,
                            index,
                        })}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        width: '85%',
        maxHeight: '80%',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    timeOption: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        height: 60,
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
