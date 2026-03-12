package __SONIYA_PACKAGE__;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.service.notification.NotificationListenerService;

public class SoniyaBootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || intent.getAction() == null) {
      return;
    }

    String action = intent.getAction();
    if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
      return;
    }

    SoniyaForegroundService.startService(context);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      NotificationListenerService.requestRebind(
        new ComponentName(context, SoniyaNotificationListenerService.class)
      );
    }
  }
}
