package __SONIYA_PACKAGE__;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.ImageView;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class SoniyaForegroundService extends Service {
  private static final String CHANNEL_ID = "soniya_stage4_channel";
  private static final int NOTIFICATION_ID = 4107;
  private static View floatingBubbleView;
  private static WindowManager windowManager;

  public static void startService(Context context) {
    Intent intent = new Intent(context, SoniyaForegroundService.class);
    ContextCompat.startForegroundService(context, intent);
  }

  public static void stopService(Context context) {
    context.stopService(new Intent(context, SoniyaForegroundService.class));
  }

  public static void showFloatingBubble(Context context) {
    if (floatingBubbleView != null) return;

    windowManager = (WindowManager) context.getSystemService(WINDOW_SERVICE);

    ImageView bubble = new ImageView(context);
    bubble.setImageResource(context.getApplicationInfo().icon);
    bubble.setScaleType(ImageView.ScaleType.CENTER_CROP);

    int size = dpToPx(context, 58);
    int padding = dpToPx(context, 8);
    bubble.setPadding(padding, padding, padding, padding);

    GradientDrawable bg = new GradientDrawable();
    bg.setShape(GradientDrawable.OVAL);
    bg.setColor(0xE61B2333);
    bg.setStroke(dpToPx(context, 2), 0x55FFFFFF);
    bubble.setBackground(bg);
    bubble.setClipToOutline(true);

    int layoutType;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
    } else {
        layoutType = WindowManager.LayoutParams.TYPE_PHONE;
    }

    final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
        size,
        size,
        layoutType,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        PixelFormat.TRANSLUCENT
    );

    params.gravity = Gravity.TOP | Gravity.START;
    params.x = dpToPx(context, 12);
    params.y = dpToPx(context, 160);

    final int touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
    bubble.setOnTouchListener(new View.OnTouchListener() {
      private int initialX;
      private int initialY;
      private float initialTouchX;
      private float initialTouchY;
      private boolean moved;

      @Override
      public boolean onTouch(View v, MotionEvent event) {
        switch (event.getAction()) {
          case MotionEvent.ACTION_DOWN:
            moved = false;
            initialX = params.x;
            initialY = params.y;
            initialTouchX = event.getRawX();
            initialTouchY = event.getRawY();
            return true;
          case MotionEvent.ACTION_MOVE:
            int dx = (int) (event.getRawX() - initialTouchX);
            int dy = (int) (event.getRawY() - initialTouchY);
            if (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop) {
              moved = true;
            }
            params.x = initialX + dx;
            params.y = initialY + dy;
            if (windowManager != null) {
              windowManager.updateViewLayout(bubble, params);
            }
            return true;
          case MotionEvent.ACTION_UP:
            if (!moved) {
              Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
              if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(launchIntent);
              }
            }
            return true;
          default:
            return false;
        }
      }
    });

    windowManager.addView(bubble, params);
    floatingBubbleView = bubble;
  }

  public static void hideFloatingBubble(Context context) {
    if (floatingBubbleView != null && windowManager != null) {
      windowManager.removeView(floatingBubbleView);
      floatingBubbleView = null;
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    SoniyaNotificationStore.setForegroundServiceActive(this, true);
    startForeground(NOTIFICATION_ID, buildNotification());
    return START_STICKY;
  }

  @Override
  public void onDestroy() {
    hideFloatingBubble(this);
    SoniyaNotificationStore.setForegroundServiceActive(this, false);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private Notification buildNotification() {
    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pendingIntent = null;

    if (launchIntent != null) {
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
      int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
        ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        : PendingIntent.FLAG_UPDATE_CURRENT;
      pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags);
    }

    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Soniya Agentic AI")
      .setContentText("Soniya is active and watching for messages.")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW);

    if (pendingIntent != null) {
      builder.setContentIntent(pendingIntent);
    }

    return builder.build();
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Soniya Background Listener",
      NotificationManager.IMPORTANCE_LOW
    );
    channel.setDescription("Keeps Soniya's local Stage 7 Android listener active.");

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  private static int dpToPx(Context context, int dp) {
    float density = context.getResources().getDisplayMetrics().density;
    return Math.round(dp * density);
  }
}
