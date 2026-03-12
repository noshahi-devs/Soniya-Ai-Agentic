package __SONIYA_PACKAGE__;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

public class SoniyaAndroidModule extends ReactContextBaseJavaModule {
  public SoniyaAndroidModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return "SoniyaAndroidBridge";
  }

  @ReactMethod
  public void getServiceStatus(Promise promise) {
    try {
      JSONObject status = SoniyaNotificationStore.getStatus(
        getReactApplicationContext(),
        isNotificationAccessEnabled()
      );

      WritableMap payload = Arguments.createMap();
      payload.putBoolean("bridgeAvailable", true);
      payload.putBoolean("notificationAccessEnabled", status.optBoolean("notificationAccessEnabled", false));
      payload.putBoolean("listenerConnected", status.optBoolean("listenerConnected", false));
      payload.putDouble("listenerConnectedAt", status.optLong("listenerConnectedAt", 0L));
      payload.putBoolean("foregroundServiceActive", status.optBoolean("foregroundServiceActive", false));
      payload.putDouble("foregroundServiceStartedAt", status.optLong("foregroundServiceStartedAt", 0L));
      payload.putInt("storedCount", status.optInt("storedCount", 0));
      promise.resolve(payload);
    } catch (Exception error) {
      promise.reject("E_STAGE4_STATUS", error);
    }
  }

  @ReactMethod
  public void openNotificationListenerSettings(Promise promise) {
    try {
      Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getReactApplicationContext().startActivity(intent);
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_STAGE4_NOTIFICATION_SETTINGS", error);
    }
  }

  @ReactMethod
  public void startAssistantService(Promise promise) {
    try {
      SoniyaForegroundService.startService(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_STAGE4_SERVICE_START", error);
    }
  }

  @ReactMethod
  public void requestNotificationRebind(Promise promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        NotificationListenerService.requestRebind(
          new ComponentName(getReactApplicationContext(), SoniyaNotificationListenerService.class)
        );
      }
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_STAGE4_REBIND", error);
    }
  }

  @ReactMethod
  public void getCapturedNotifications(Promise promise) {
    try {
      JSONArray notifications = SoniyaNotificationStore.getNotifications(getReactApplicationContext());
      WritableArray payload = Arguments.createArray();

      for (int index = 0; index < notifications.length(); index += 1) {
        JSONObject item = notifications.optJSONObject(index);
        if (item == null) {
          continue;
        }

        WritableMap nextItem = Arguments.createMap();
        nextItem.putString("id", item.optString("id", ""));
        nextItem.putString("packageName", item.optString("packageName", ""));
        nextItem.putString("app", item.optString("app", ""));
        nextItem.putString("sender", item.optString("sender", ""));
        nextItem.putString("body", item.optString("body", ""));
        nextItem.putString("receivedAt", item.optString("receivedAt", ""));
        nextItem.putDouble("receivedAtMs", item.optLong("receivedAtMs", 0L));
        payload.pushMap(nextItem);
      }

      promise.resolve(payload);
    } catch (Exception error) {
      promise.reject("E_STAGE4_NOTIFICATIONS", error);
    }
  }

  @ReactMethod
  public void clearCapturedNotifications(Promise promise) {
    try {
      SoniyaNotificationStore.clearNotifications(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_STAGE4_CLEAR", error);
    }
  }

  @ReactMethod
  public void launchApp(String appQuery, Promise promise) {
    try {
      WritableMap payload = Arguments.createMap();
      payload.putBoolean("ok", false);
      payload.putBoolean("installed", false);
      payload.putString("query", appQuery == null ? "" : appQuery.trim());

      String normalizedQuery = normalizeQuery(appQuery);
      if (normalizedQuery.isEmpty()) {
        payload.putString("reason", "missing_query");
        promise.resolve(payload);
        return;
      }

      PackageManager packageManager = getReactApplicationContext().getPackageManager();
      Intent directLaunchIntent = packageManager.getLaunchIntentForPackage(appQuery);
      if (directLaunchIntent != null) {
        directLaunchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(directLaunchIntent);

        payload.putBoolean("ok", true);
        payload.putBoolean("installed", true);
        payload.putString("packageName", appQuery);
        payload.putString("appName", resolveApplicationLabel(packageManager, appQuery));
        promise.resolve(payload);
        return;
      }

      ResolveInfo bestMatch = findBestLaunchableApp(packageManager, normalizedQuery);
      if (bestMatch == null || bestMatch.activityInfo == null) {
        payload.putString("reason", "not_installed");
        promise.resolve(payload);
        return;
      }

      ActivityInfo activityInfo = bestMatch.activityInfo;
      String packageName = activityInfo.packageName;
      Intent launchIntent = packageManager.getLaunchIntentForPackage(packageName);
      if (launchIntent == null) {
        payload.putString("reason", "not_launchable");
        payload.putString("packageName", packageName);
        payload.putString("appName", resolveApplicationLabel(packageManager, packageName));
        promise.resolve(payload);
        return;
      }

      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getReactApplicationContext().startActivity(launchIntent);

      payload.putBoolean("ok", true);
      payload.putBoolean("installed", true);
      payload.putString("packageName", packageName);
      payload.putString("appName", resolveResolveInfoLabel(packageManager, bestMatch, packageName));
      promise.resolve(payload);
    } catch (Exception error) {
      promise.reject("E_STAGE6_LAUNCH_APP", error);
    }
  }

  @ReactMethod
  public void getAccessibilityStatus(Promise promise) {
    try {
      WritableMap payload = Arguments.createMap();
      payload.putBoolean("enabled", SoniyaAccessibilityService.isRunning());
      promise.resolve(payload);
    } catch (Exception error) {
      promise.reject("E_ACCESSIBILITY_STATUS", error);
    }
  }

  @ReactMethod
  public void clickByText(String text, Promise promise) {
    try {
      if (!SoniyaAccessibilityService.isRunning()) {
        promise.reject("E_SERVICE_NOT_RUNNING", "Accessibility service is not enabled");
        return;
      }

      boolean success = SoniyaAccessibilityService.getInstance().clickByText(text);
      promise.resolve(success);
    } catch (Exception error) {
      promise.reject("E_CLICK_BY_TEXT", error);
    }
  }

  @ReactMethod
  public void typeText(String text, Promise promise) {
    try {
      if (!SoniyaAccessibilityService.isRunning()) {
        promise.reject("E_SERVICE_NOT_RUNNING", "Accessibility service is not enabled");
        return;
      }

      boolean success = SoniyaAccessibilityService.getInstance().typeText(text);
      promise.resolve(success);
    } catch (Exception error) {
      promise.reject("E_TYPE_TEXT", error);
    }
  }

  @ReactMethod
  public void performScroll(boolean forward, Promise promise) {
    try {
      if (!SoniyaAccessibilityService.isRunning()) {
        promise.reject("E_SERVICE_NOT_RUNNING", "Accessibility service is not enabled");
        return;
      }
      boolean success = SoniyaAccessibilityService.getInstance().performScroll(forward);
      promise.resolve(success);
    } catch (Exception error) {
      promise.reject("E_SCROLL", error);
    }
  }

  @ReactMethod
  public void showFloatingBubble(Promise promise) {
    try {
      SoniyaForegroundService.showFloatingBubble(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_FLOATING_BUBBLE", error);
    }
  }

  @ReactMethod
  public void hideFloatingBubble(Promise promise) {
    try {
      SoniyaForegroundService.hideFloatingBubble(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_HIDE_BUBBLE", error);
    }
  }

  @ReactMethod
  public void stopAssistantService(Promise promise) {
    try {
      SoniyaForegroundService.stopService(getReactApplicationContext());
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("E_SERVICE_STOP", error);
    }
  }

  private boolean isNotificationAccessEnabled() {
    String enabledListeners = Settings.Secure.getString(
      getReactApplicationContext().getContentResolver(),
      "enabled_notification_listeners"
    );

    if (enabledListeners == null || enabledListeners.isEmpty()) {
      return false;
    }

    String componentName = new ComponentName(
      getReactApplicationContext(),
      SoniyaNotificationListenerService.class
    ).flattenToString();

    return enabledListeners.contains(componentName);
  }

  private ResolveInfo findBestLaunchableApp(PackageManager packageManager, String normalizedQuery) {
    Intent selectorIntent = new Intent(Intent.ACTION_MAIN, null);
    selectorIntent.addCategory(Intent.CATEGORY_LAUNCHER);

    List<ResolveInfo> installedApps = getLauncherActivities(packageManager, selectorIntent);
    ResolveInfo bestMatch = null;
    int bestScore = -1;

    for (ResolveInfo item : installedApps) {
      if (item == null || item.activityInfo == null) {
        continue;
      }

      String packageName = item.activityInfo.packageName == null ? "" : item.activityInfo.packageName;
      String label = resolveResolveInfoLabel(packageManager, item, packageName);
      int score = scoreAppMatch(normalizedQuery, normalizeQuery(label), normalizeQuery(packageName));

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  private List<ResolveInfo> getLauncherActivities(PackageManager packageManager, Intent selectorIntent) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return packageManager.queryIntentActivities(
        selectorIntent,
        PackageManager.ResolveInfoFlags.of(0L)
      );
    }

    return packageManager.queryIntentActivities(selectorIntent, 0);
  }

  private int scoreAppMatch(String query, String normalizedLabel, String normalizedPackageName) {
    if (query.isEmpty()) {
      return -1;
    }

    if (query.equals(normalizedLabel) || query.equals(normalizedPackageName)) {
      return 400;
    }

    if (normalizedLabel.startsWith(query)) {
      return 300;
    }

    if (normalizedLabel.contains(query)) {
      return 200;
    }

    if (normalizedPackageName.startsWith(query)) {
      return 150;
    }

    if (normalizedPackageName.contains(query)) {
      return 100;
    }

    return -1;
  }

  private String resolveResolveInfoLabel(PackageManager packageManager, ResolveInfo info, String packageName) {
    CharSequence label = info.loadLabel(packageManager);
    if (label != null) {
      return label.toString();
    }

    return resolveApplicationLabel(packageManager, packageName);
  }

  private String resolveApplicationLabel(PackageManager packageManager, String packageName) {
    try {
      return packageManager.getApplicationLabel(
        packageManager.getApplicationInfo(packageName, 0)
      ).toString();
    } catch (Exception error) {
      return packageName == null ? "" : packageName;
    }
  }

  private String normalizeQuery(String value) {
    if (value == null) {
      return "";
    }

    return value
      .toLowerCase()
      .replaceAll("[^a-z0-9 ]", " ")
      .replaceAll("\\s+", " ")
      .trim();
  }
}
