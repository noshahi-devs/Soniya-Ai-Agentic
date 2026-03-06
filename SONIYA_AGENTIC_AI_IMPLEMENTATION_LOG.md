# Soniya Agentic AI Implementation Log

## 2026-03-06

### Step 1 Completed
- Rebranded the Expo app to `Soniya Agentic AI`.
- Added the Soniya portrait asset and companion-style hero UI.
- Aligned config, package names, and provider naming with the new app identity.
- Verified Step 1 in Expo Go, with lint passing and Expo export succeeding.

### Step 2 Completed
- Added local `privacyStorage` for PIN-based unlock sessions.
- Added local `intentEngine` to parse commands like:
  - `Soniya open karo`
  - `Kis kis ka message aya hai?`
  - `Nabeel ka message open karo`
  - `Reply bhejo`
  - `Likho kal milte hain`
- Added `responseEngine` for user-facing privacy-safe responses.
- Added `messageHandler` to manage:
  - sender-list flow
  - PIN-required message reading
  - reply drafting
  - reply sending
  - privacy relocking
- Upgraded inbox storage so read/reply state can be persisted locally.
- Added `AgentStepTwoScreen` as the active Expo screen and wired the local command center through `VoiceUI`.
- Added PIN verification input, quick actions, local message sandbox, and reply suggestions to the main screen.
- Verified Step 2 with:
  - `cmd /c npm run lint`
  - `cmd /c npx expo export --platform web`
- Current verification result:
  - lint passes with 2 pre-existing warnings in `components/AmbientMusic.jsx` and `components/SplashScreen.jsx`
  - Expo web export succeeds

### Step 3 Completed
- Added `src/services/voiceService.js` as the Step 3 wrapper for:
  - TTS replies
  - speech runtime inspection
  - mic recognition status snapshots
- Wired the existing voice orb into the active screen through `VoiceHandler`.
- Added a voice command card to the main UI with:
  - live mic runtime state
  - permission state
  - recognizer service summary
  - spoken-response mode summary
- Assistant responses are now spoken locally when:
  - `voiceNotifications` is on
  - `presenceMode` is off
- Voice input still degrades safely in Expo Go and becomes live in the dev build.
- Verified Step 3 with:
  - `cmd /c npm run lint`
  - `cmd /c npx expo export --platform web`
- Current verification result:
  - lint passes with 2 pre-existing warnings in `components/AmbientMusic.jsx` and `components/SplashScreen.jsx`
  - Expo web export succeeds

### Next
- Verify Step 3 in Expo Go and the Android dev build.
- Stage 4: start Expo prebuild/native Android integration for notification listener and background service.

## 2026-03-07

### Companion UI Refresh
- Replaced the old card-heavy entry screen with a new avatar-first companion screen.
- Promoted `SoniyaAvatar` to the main experience so Soniya stays visible on the home screen.
- Moved inbox, PIN, settings, and runtime details into a separate utility screen that opens on demand.
- Kept the message privacy flow available, but removed it from the main UI so the home screen stays focused.

### Conversation Wiring
- Added `src/services/assistantRouter.js` to route user input across:
  - local memory commands
  - protected message commands
  - general AI conversation
- Wired typed prompts and captured speech into the same conversation flow.
- Upgraded spoken replies so the home-screen avatar can react while Soniya is speaking.

### Project Cleanup
- Removed unused Expo template files that were causing lint failures.
- Fixed existing hook warnings in `components/AmbientMusic.jsx` and `components/SplashScreen.jsx`.

### Verification
- `cmd /c npm run lint`
- `cmd /c npx expo export --platform web`

### Current Note
- General conversation is now wired, but live microphone capture still depends on running the app in a development build because `expo-speech-recognition` uses custom native code.
