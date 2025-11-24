import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        await TrackPlayer.reset();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        // Could use for skip/reset
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        // Could use for additional controls
    });
};
