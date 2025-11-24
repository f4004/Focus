import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

interface Song {
    uri: string;
    name: string;
}

interface MusicContextType {
    playlist: Song[];
    isPlaying: boolean;
    addToPlaylist: () => Promise<void>;
    removeFromPlaylist: (uri: string) => void;
    toggleMusic: () => Promise<void>;
    duckVolume: () => Promise<void>;
    restoreVolume: () => Promise<void>;
    isMusicEnabled: boolean;
    setIsMusicEnabled: (enabled: boolean) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMusicEnabled, setIsMusicEnabled] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const currentSongIndex = useRef(0);

    useEffect(() => {
        loadPlaylist();
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(err => console.log('Failed to unload sound on unmount', err));
            }
        };
    }, []);

    useEffect(() => {
        if (!isMusicEnabled && soundRef.current) {
            soundRef.current.stopAsync();
            setIsPlaying(false);
        }
    }, [isMusicEnabled]);

    const loadPlaylist = async () => {
        try {
            const savedPlaylist = await AsyncStorage.getItem('user_playlist');
            const savedEnabled = await AsyncStorage.getItem('music_enabled');
            if (savedPlaylist) setPlaylist(JSON.parse(savedPlaylist));
            if (savedEnabled) setIsMusicEnabled(JSON.parse(savedEnabled));
        } catch (error) {
            console.error('Failed to load music settings', error);
        }
    };

    const savePlaylist = async (newPlaylist: Song[]) => {
        setPlaylist(newPlaylist);
        try {
            await AsyncStorage.setItem('user_playlist', JSON.stringify(newPlaylist));
        } catch (error) {
            console.error('Failed to save playlist', error);
        }
    };

    const addToPlaylist = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
                multiple: true
            });

            if (!result.canceled && result.assets) {
                const newSongs = result.assets.map(asset => ({
                    uri: asset.uri,
                    name: asset.name
                }));
                const updatedPlaylist = [...playlist, ...newSongs];
                savePlaylist(updatedPlaylist);
            }
        } catch (error) {
            console.error('Failed to pick songs', error);
        }
    };

    const removeFromPlaylist = (uri: string) => {
        const updatedPlaylist = playlist.filter(song => song.uri !== uri);
        savePlaylist(updatedPlaylist);
        if (playlist[currentSongIndex.current]?.uri === uri) {
            stopMusic();
        }
    };

    const playNextSong = async () => {
        if (playlist.length === 0) return;

        currentSongIndex.current = (currentSongIndex.current + 1) % playlist.length;
        await playSong(playlist[currentSongIndex.current].uri);
    };

    const playSong = async (uri: string) => {
        try {
            if (soundRef.current) {
                try {
                    await soundRef.current.unloadAsync();
                } catch (unloadError) {
                    console.log('Error unloading previous sound:', unloadError);
                }
                soundRef.current = null;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true, volume: 1.0 }
            );

            soundRef.current = sound;
            setIsPlaying(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    playNextSong();
                }
            });
        } catch (error) {
            console.error('Failed to play song', error);
            // Try next song on error
            playNextSong();
        }
    };

    const toggleMusic = async () => {
        if (!isMusicEnabled || playlist.length === 0) return;

        if (isPlaying) {
            await pauseMusic();
        } else {
            if (soundRef.current) {
                await soundRef.current.playAsync();
                setIsPlaying(true);
            } else {
                await playSong(playlist[currentSongIndex.current].uri);
            }
        }
    };

    const pauseMusic = async () => {
        if (soundRef.current) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
        }
    };

    const stopMusic = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            setIsPlaying(false);
        }
    };

    const duckVolume = async () => {
        if (soundRef.current && isPlaying) {
            await soundRef.current.setVolumeAsync(0.2);
        }
    };

    const restoreVolume = async () => {
        if (soundRef.current && isPlaying) {
            await soundRef.current.setVolumeAsync(1.0);
        }
    };

    const updateMusicEnabled = async (enabled: boolean) => {
        setIsMusicEnabled(enabled);
        try {
            await AsyncStorage.setItem('music_enabled', JSON.stringify(enabled));
        } catch (error) {
            console.error('Failed to save music enabled', error);
        }
    };

    return (
        <MusicContext.Provider value={{
            playlist,
            isPlaying,
            addToPlaylist,
            removeFromPlaylist,
            toggleMusic,
            duckVolume,
            restoreVolume,
            isMusicEnabled,
            setIsMusicEnabled: updateMusicEnabled
        }}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};
