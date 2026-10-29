// Bridge to the Android app through Capacitor. In a plain browser every call
// falls back to a web equivalent or does nothing, so the game runs the same way.

const Native = {
  plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  },

  isApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },

  // onBack: Android back button. onBackground: app hidden or switched away.
  init({ onBack, onBackground }) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onBackground();
    });
    if (!this.isApp()) return;

    const { App, StatusBar } = this.plugins();
    if (StatusBar) StatusBar.hide().catch(() => {});
    if (App) {
      App.addListener('backButton', onBack);
      App.addListener('appStateChange', (state) => {
        if (!state.isActive) onBackground();
      });
    }
  },

  // kind: 'eat' (short buzz) or 'hit' (strong buzz)
  vibrate(kind) {
    const { Haptics } = this.plugins();
    if (this.isApp() && Haptics) {
      Haptics.impact({ style: kind === 'hit' ? 'HEAVY' : 'LIGHT' }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(kind === 'hit' ? 120 : 20);
    }
  },

  exitApp() {
    const { App } = this.plugins();
    if (this.isApp() && App) App.exitApp();
  },
};
