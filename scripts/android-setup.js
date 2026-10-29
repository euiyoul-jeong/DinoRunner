// Run once after `cap add android` (npm run android:setup does both).
// Locks the game to landscape and makes the app full screen with the screen kept on.
// Safe to run again: each change is skipped if it is already there.
const fs = require('fs');
const path = require('path');

const androidMain = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const manifestPath = path.join(androidMain, 'AndroidManifest.xml');
const activityPath = path.join(androidMain, 'java', 'com', 'dinorunner', 'app', 'MainActivity.java');

function patchManifest() {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  if (xml.includes('android:screenOrientation')) {
    console.log('AndroidManifest.xml: landscape already set');
    return;
  }
  xml = xml.replace(/<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"');
  fs.writeFileSync(manifestPath, xml);
  console.log('AndroidManifest.xml: locked to landscape');
}

const MAIN_ACTIVITY = `package com.dinorunner.app;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Don't let the screen dim while a child is playing
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // Full screen; a swipe from the edge shows the bars for a moment
    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`;

function patchActivity() {
  const current = fs.readFileSync(activityPath, 'utf8');
  if (current.includes('hideSystemBars')) {
    console.log('MainActivity.java: full screen already set');
    return;
  }
  fs.writeFileSync(activityPath, MAIN_ACTIVITY);
  console.log('MainActivity.java: full screen + keep screen on');
}

patchManifest();
patchActivity();
