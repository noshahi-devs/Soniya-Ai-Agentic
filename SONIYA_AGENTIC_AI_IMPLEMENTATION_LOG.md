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

### Stage 4 Started
- Added `plugins/withSoniyaAndroidBridge.js` to inject Stage 4 Android native integration during Expo prebuild.
- Added native Android templates for:
  - notification listener service
  - foreground service
  - boot receiver
  - React Native bridge module/package
  - local notification snapshot store
- Added `src/services/nativeAssistantService.js` to expose the Stage 4 native bridge to JS.
- Extended the utility screen so Android Stage 4 status, notification access, service start, rebind, and native inbox sync can be managed from the app.
- Added `mergeNativeNotificationsIntoInbox` so captured local Android notifications can be pulled into the existing inbox flow.

### Stage 4 Validation
- Ran `cmd /c npx expo prebuild --platform android --no-install`
- Ran `cmd /c npx expo prebuild --platform android --no-install --clean`
- Confirmed generated Android project includes:
  - `.soniya.SoniyaNotificationListenerService`
  - `.soniya.SoniyaForegroundService`
  - `.soniya.SoniyaBootReceiver`
  - `SoniyaAndroidPackage()` registration in `MainApplication.kt`

### Stage 4 Completion Note
- Stage 4 code integration is complete in the repo.
- User-side verification indicates the Stage 4 Android bridge data is now showing in the app.
- This workspace still cannot run a full native Android compile because `JAVA_HOME` is not configured and no `java` executable is available on PATH.

### Next
- Stage 5: harden the real companion experience with:
  - reliable device-side voice QA
  - stronger persistent personal memory
  - smart reply suggestions and reminders
  - privacy-safe release preparation

### Stage 5 Started
- Expanded `api/localMemory.js` so Soniya can now save more natural personal facts without requiring rigid phrasing.
- Added local-memory capture for items like:
  - user name
  - birthday
  - age
  - city
  - profession
  - likes
  - favorite categories
- Added local-memory recall for prompts such as:
  - `mera naam kya hai`
  - `meri age kya hai`
  - `main kahan se hoon`
  - `mujhe kya pasand hai`
  - `mere bare mein kya yaad hai`
- Kept all of this local-only so the new personal memory behavior does not need to send saved profile data to external AI providers.

### Stage 5 Companion Profile Flow
- Added a proactive companion-profile flow so Soniya can now ask the user for basic personal details instead of waiting for rigid save commands.
- The home screen now loads the next pending profile question during hydration if the local profile is incomplete.
- Added support for short direct answers to pending prompts, so replies like `25`, `Lahore`, or `blue` can be saved without full sentence formatting.
- After saving one answer, Soniya now continues to the next missing profile question automatically until the basic profile is complete.

### Stage 5 Home UI Tuning
- Simplified the home screen so Soniya stays visually dominant instead of being pushed down by long text sections.
- Replaced the heavy chat stack on the home screen with a compact bottom dock that keeps input, mic, and key actions available.
- Moved recent conversation visibility to the utility screen so detailed text is still available without cluttering the main companion view.

### Stage 6 Started
- Added Stage 6 privacy-hardening work for user-defined PIN management.
- Added helpers in `src/storage/privacyStorage.js` for:
  - PIN normalization
  - PIN validation
  - default-PIN detection
  - safe PIN update flow
- Synced local-memory security PIN updates in `api/localMemory.js` so protected personal facts and message privacy keep using the same active PIN.
- Added a new `PIN security` card to the utility screen so the user can:
  - change the active PIN
  - see whether the app is still on the default PIN
  - force privacy lock immediately
- Removed user-facing text that exposed the demo PIN directly and switched those prompts to generic verification wording.

### Stage 6 App Launch Update
- Extended the Android native bridge so Soniya can now launch installed apps from the companion flow.
- Added app-launch parsing for text and voice commands such as:
  - `WhatsApp kholo`
  - `Facebook kholo`
  - `open Instagram`
  - `Settings khol do`
- Added alias handling for common apps and a native fallback search across installed launcher apps when the user names an app more loosely.
- Added graceful fallback replies when:
  - the app is not installed
  - the Android native bridge is unavailable
  - the current build cannot perform native app launches
- Kept this independent from local memory and privacy storage so saved user data remains untouched.

### Stage 7 Privacy & Automation Implementation
- Added high-priority local intent detection for:
  - **Call/Contact Commands**: "Adeel bai ko call karo"
  - **Scroll Automation**: "Scroll karo", "Niche jao"
  - **Web Search**: "Search for Pakistan", "Google search karo"
- Implemented Privacy-Safe Routing:
  - Call queries and search terms are now intercepted by `assistantRouter.js`.
  - These triggers **bypass the external AI API (Gemini)** entirely to ensure private names and numbers never leave the device.
- Extended `src/services/nativeAssistantService.js` with Linking fallbacks for calls and searches.
- Updated `src/ai/responseEngine.js` with dedicated success/failure replies for phone actions.
- Verified that local command detection handles Urdu-mixed phrasing (e.g., "ko call karo", "khol do").

### Next
- Implement Android Accessibility Service for Stage 7 "scroll" automation logic.
- Add Contact-Sync bridge to resolve "Adeel bai" names to actual phone numbers locally.
