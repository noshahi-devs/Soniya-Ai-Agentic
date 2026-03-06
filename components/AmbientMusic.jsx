import { Audio } from 'expo-av';
import { useEffect, useRef } from 'react';

const moodMusic = {
    LOVE: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Example links
    SAD: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    HAPPY: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
};

const AmbientMusic = ({ mood }) => {
    const soundRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        let currentSound;

        const playSound = async () => {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: moodMusic[mood] || moodMusic.HAPPY },
                { shouldPlay: true, isLooping: true, volume: 0.2 }
            );

            currentSound = newSound;

            if (mounted) {
                soundRef.current = newSound;
            } else {
                await newSound.unloadAsync();
            }
        };

        playSound();

        return () => {
            mounted = false;
            if (currentSound) {
                currentSound.unloadAsync();
            }
        };
    }, [mood]);

    return null; // Ye UI mein nazar nahi aaye ga
};

export default AmbientMusic;
