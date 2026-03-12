# Play Protect & Release Builds

If you install a **sideloaded APK** (preview/dev build), Google Play Protect often blocks it, especially when the app requests **high‑risk permissions** like Accessibility, Overlay (floating bubble), Notification Listener, and Foreground Service.

The reliable solution is to install via **Google Play Internal Testing** using a **release‑signed AAB**.

## Recommended Path (Play Internal Testing)
1. Build a production AAB:
   ```
   eas build --profile production --platform android
   ```
2. Download the AAB from the EAS build dashboard.
3. Open **Google Play Console** → **Internal testing** → **Create release** → upload the AAB.
4. Add testers and share the testing link.
5. Install from the Play testing link on the device.

This path avoids Play Protect warnings and keeps installs smooth.

## Note
Even a release build installed **outside Play Store** can still trigger Play Protect warnings because it is sideloaded.
