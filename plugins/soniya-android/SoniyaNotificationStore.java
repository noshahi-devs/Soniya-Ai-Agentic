package __SONIYA_PACKAGE__;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class SoniyaNotificationStore {
  private static final String PREFS_NAME = "soniya_stage4_bridge";
  private static final String KEY_NOTIFICATIONS = "captured_notifications";
  private static final String KEY_LISTENER_CONNECTED = "listener_connected";
  private static final String KEY_LISTENER_CONNECTED_AT = "listener_connected_at";
  private static final String KEY_FOREGROUND_SERVICE_ACTIVE = "foreground_service_active";
  private static final String KEY_FOREGROUND_SERVICE_STARTED_AT = "foreground_service_started_at";
  private static final int MAX_ITEMS = 40;

  private SoniyaNotificationStore() {}

  private static SharedPreferences getPrefs(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }

  public static synchronized void appendNotification(Context context, JSONObject payload) {
    JSONArray current = getNotifications(context);
    JSONArray next = new JSONArray();
    next.put(payload);

    for (int index = 0; index < current.length() && index < MAX_ITEMS - 1; index += 1) {
      next.put(current.opt(index));
    }

    getPrefs(context).edit().putString(KEY_NOTIFICATIONS, next.toString()).apply();
  }

  public static synchronized JSONArray getNotifications(Context context) {
    String raw = getPrefs(context).getString(KEY_NOTIFICATIONS, "[]");

    try {
      return new JSONArray(raw);
    } catch (JSONException error) {
      return new JSONArray();
    }
  }

  public static synchronized void clearNotifications(Context context) {
    getPrefs(context).edit().putString(KEY_NOTIFICATIONS, "[]").apply();
  }

  public static synchronized void setListenerConnected(Context context, boolean connected) {
    SharedPreferences.Editor editor = getPrefs(context).edit();
    editor.putBoolean(KEY_LISTENER_CONNECTED, connected);

    if (connected) {
      editor.putLong(KEY_LISTENER_CONNECTED_AT, System.currentTimeMillis());
    }

    editor.apply();
  }

  public static synchronized void setForegroundServiceActive(Context context, boolean active) {
    SharedPreferences.Editor editor = getPrefs(context).edit();
    editor.putBoolean(KEY_FOREGROUND_SERVICE_ACTIVE, active);

    if (active) {
      editor.putLong(KEY_FOREGROUND_SERVICE_STARTED_AT, System.currentTimeMillis());
    }

    editor.apply();
  }

  public static synchronized JSONObject getStatus(Context context, boolean notificationAccessEnabled) {
    SharedPreferences prefs = getPrefs(context);
    JSONObject payload = new JSONObject();

    try {
      payload.put("notificationAccessEnabled", notificationAccessEnabled);
      payload.put("listenerConnected", prefs.getBoolean(KEY_LISTENER_CONNECTED, false));
      payload.put("listenerConnectedAt", prefs.getLong(KEY_LISTENER_CONNECTED_AT, 0L));
      payload.put("foregroundServiceActive", prefs.getBoolean(KEY_FOREGROUND_SERVICE_ACTIVE, false));
      payload.put("foregroundServiceStartedAt", prefs.getLong(KEY_FOREGROUND_SERVICE_STARTED_AT, 0L));
      payload.put("storedCount", getNotifications(context).length());
    } catch (JSONException ignored) {
      // Keep the payload best-effort and local.
    }

    return payload;
  }
}
