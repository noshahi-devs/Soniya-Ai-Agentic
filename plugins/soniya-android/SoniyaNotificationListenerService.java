package __SONIYA_PACKAGE__;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.DateFormat;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class SoniyaNotificationListenerService extends NotificationListenerService {
  private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(
    Arrays.asList("com.whatsapp", "com.whatsapp.w4b")
  );

  @Override
  public void onListenerConnected() {
    super.onListenerConnected();
    SoniyaNotificationStore.setListenerConnected(this, true);
    SoniyaForegroundService.startService(this);
  }

  @Override
  public void onListenerDisconnected() {
    SoniyaNotificationStore.setListenerConnected(this, false);
    super.onListenerDisconnected();
  }

  @Override
  public void onNotificationPosted(StatusBarNotification statusBarNotification) {
    if (statusBarNotification == null || !SUPPORTED_PACKAGES.contains(statusBarNotification.getPackageName())) {
      return;
    }

    Notification notification = statusBarNotification.getNotification();
    if (notification == null || (notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
      return;
    }

    Bundle extras = notification.extras;
    if (extras == null) {
      return;
    }

    String sender = cleanText(firstNonEmpty(
      extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE),
      extras.getCharSequence(Notification.EXTRA_TITLE)
    ));

    String body = cleanText(firstNonEmpty(
      extras.getCharSequence(Notification.EXTRA_TEXT),
      extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
    ));

    if (sender.isEmpty() || body.isEmpty()) {
      return;
    }

    long receivedAtMs = statusBarNotification.getPostTime();
    String receivedAt = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
      .format(receivedAtMs);

    JSONObject payload = new JSONObject();
    try {
      payload.put("id", statusBarNotification.getKey());
      payload.put("packageName", statusBarNotification.getPackageName());
      payload.put("app", resolveAppLabel(statusBarNotification.getPackageName()));
      payload.put("sender", sender);
      payload.put("body", body);
      payload.put("receivedAt", receivedAt);
      payload.put("receivedAtMs", receivedAtMs);
      SoniyaNotificationStore.appendNotification(this, payload);
      SoniyaForegroundService.startService(this);
    } catch (JSONException ignored) {
      // Keep the listener fail-safe and private.
    }
  }

  private CharSequence firstNonEmpty(CharSequence primary, CharSequence fallback) {
    if (primary != null && primary.length() > 0) {
      return primary;
    }

    return fallback == null ? "" : fallback;
  }

  private String cleanText(CharSequence value) {
    return value == null ? "" : String.valueOf(value).trim();
  }

  private String resolveAppLabel(String packageName) {
    try {
      return getPackageManager().getApplicationLabel(
        getPackageManager().getApplicationInfo(packageName, 0)
      ).toString();
    } catch (Exception ignored) {
      return packageName;
    }
  }
}
