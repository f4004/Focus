# Silent Audio File Required

For lock screen controls to work, you need a silent audio file at:
`assets/silent.mp3`

## How to Create:

### Option 1: Download from web
Download a 1-second silent mp3 file from websites like:
- https://github.com/anars/blank-audio
- Or search for "1 second silent mp3"

### Option 2: Create with software
Use Audacity or similar audio software:
1. Generate → Silence → 1 second
2. Export as MP3
3. Save as `silent.mp3` in the `assets` folder

## Why is this needed?

React Native Track Player requires an active audio track to maintain the media session and show lock screen controls. We play this silent audio in a loop to keep the media notification active while the timer is running, which allows the Play/Pause/Stop buttons to appear on the lock screen.

The audio volume is silent, so users won't hear anything, but Android will treat the app as playing media and show the controls.
