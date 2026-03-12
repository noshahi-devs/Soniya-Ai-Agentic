package __SONIYA_PACKAGE__;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Bundle;

import java.util.List;

public class SoniyaAccessibilityService extends AccessibilityService {
    private static SoniyaAccessibilityService instance;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // We will process events on demand via static methods to save battery
    }

    @Override
    public void onInterrupt() {
        instance = null;
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    public static boolean isRunning() {
        return instance != null;
    }

    public static SoniyaAccessibilityService getInstance() {
        return instance;
    }

    // Action: Click by Text
    public boolean clickByText(String text) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return false;

        List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(text);
        if (nodes != null && !nodes.isEmpty()) {
            for (AccessibilityNodeInfo node : nodes) {
                if (node.isClickable()) {
                    return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                // Try parent if node itself isn't clickable but label is
                AccessibilityNodeInfo parent = node.getParent();
                while (parent != null) {
                    if (parent.isClickable()) {
                        return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    parent = parent.getParent();
                }
            }
        }
        return false;
    }

    // Action: Type Text into Focused Field
    public boolean typeText(String text) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return false;

        AccessibilityNodeInfo focusedNode = rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focusedNode != null) {
            Bundle arguments = new Bundle();
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            return focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
        }
        return false;
    }

    // Action: Global Scroll
    public boolean performScroll(boolean forward) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return false;

        return rootNode.performAction(forward ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
    }

    // Action: Swipe Gesture (Precise control)
    public void performSwipe(int startX, int startY, int endX, int endY, int duration) {
        Path path = new Path();
        path.moveTo(startX, startY);
        path.lineTo(endX, endY);

        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, duration));
        dispatchGesture(builder.build(), null, null);
    }
}
