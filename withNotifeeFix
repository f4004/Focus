const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotifeeFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Find the Notifee service or create it if missing
    let service = mainApplication.service?.find(
      (s) => s['$']['android:name'] === 'app.notifee.core.ForegroundService'
    );

    if (!service) {
      service = { $: { 'android:name': 'app.notifee.core.ForegroundService' } };
      if (!mainApplication.service) mainApplication.service = [];
      mainApplication.service.push(service);
    }

    // Add the required Android 14 attributes
    service['$']['android:foregroundServiceType'] = 'mediaPlayback';
    // Add tools:replace to ensure our value wins
    service['$']['tools:replace'] = 'android:foregroundServiceType';

    return config;
  });
};
