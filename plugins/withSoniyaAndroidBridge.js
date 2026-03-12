const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-soniya-android-bridge';
const PLUGIN_VERSION = '1.0.0';
const TEMPLATE_DIR = path.join(__dirname, 'soniya-android');
const TEMPLATE_FILES = [
  'SoniyaAndroidModule.java',
  'SoniyaAndroidPackage.java',
  'SoniyaBootReceiver.java',
  'SoniyaForegroundService.java',
  'SoniyaNotificationListenerService.java',
  'SoniyaNotificationStore.java',
  'SoniyaAccessibilityService.java',
];

const ensureArrayField = (parent, key) => {
  if (!Array.isArray(parent[key])) {
    parent[key] = [];
  }

  return parent[key];
};

const upsertComponent = (collection, componentName, nextValue) => {
  const existingIndex = collection.findIndex((item) => item?.$?.['android:name'] === componentName);
  if (existingIndex >= 0) {
    collection[existingIndex] = nextValue;
    return;
  }

  collection.push(nextValue);
};

const ensureManifestEntries = (config) => withAndroidManifest(config, (nextConfig) => {
  const manifest = nextConfig.modResults;
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

  const services = ensureArrayField(application, 'service');
  const receivers = ensureArrayField(application, 'receiver');

  upsertComponent(services, '.soniya.SoniyaNotificationListenerService', {
    $: {
      'android:name': '.soniya.SoniyaNotificationListenerService',
      'android:label': 'Soniya Notification Listener',
      'android:enabled': 'true',
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
    },
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': 'android.service.notification.NotificationListenerService',
            },
          },
        ],
      },
    ],
  });

  upsertComponent(services, '.soniya.SoniyaAccessibilityService', {
    $: {
      'android:name': '.soniya.SoniyaAccessibilityService',
      'android:label': 'Soniya Accessibility Service',
      'android:enabled': 'true',
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
    },
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': 'android.view.accessibility.AccessibilityService',
            },
          },
        ],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.accessibilityservice',
          'android:resource': '@xml/soniya_accessibility_config',
        },
      },
    ],
  });

  upsertComponent(services, '.soniya.SoniyaForegroundService', {
    $: {
      'android:name': '.soniya.SoniyaForegroundService',
      'android:enabled': 'true',
      'android:exported': 'false',
      'android:foregroundServiceType': 'dataSync',
    },
  });

  upsertComponent(receivers, '.soniya.SoniyaBootReceiver', {
    $: {
      'android:name': '.soniya.SoniyaBootReceiver',
      'android:enabled': 'true',
      'android:exported': 'true',
      'android:directBootAware': 'true',
    },
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': 'android.intent.action.BOOT_COMPLETED',
            },
          },
          {
            $: {
              'android:name': 'android.intent.action.MY_PACKAGE_REPLACED',
            },
          },
        ],
      },
    ],
  });

  return nextConfig;
});

const writeNativeFiles = (config) => withDangerousMod(config, ['android', async (nextConfig) => {
  const packageName = AndroidConfig.Package.getPackage(nextConfig);
  if (!packageName) {
    throw new Error('android.package is required for withSoniyaAndroidBridge');
  }

  const sourcePackage = `${packageName}.soniya`;
  const targetDirectory = path.join(
    nextConfig.modRequest.projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    ...sourcePackage.split('.')
  );

  await fs.promises.mkdir(targetDirectory, { recursive: true });

  await Promise.all(
    TEMPLATE_FILES.map(async (fileName) => {
      const templatePath = path.join(TEMPLATE_DIR, fileName);
      const targetPath = path.join(targetDirectory, fileName);
      const templateContents = await fs.promises.readFile(templatePath, 'utf8');
      const finalContents = templateContents.replace(/__SONIYA_PACKAGE__/g, sourcePackage);
      await fs.promises.writeFile(targetPath, finalContents);
    })
  );

  // Write accessibility config XML
  const resXmlDirectory = path.join(
    nextConfig.modRequest.projectRoot,
    'android',
    'app',
    'src',
    'main',
    'res',
    'xml'
  );
  await fs.promises.mkdir(resXmlDirectory, { recursive: true });
  const xmlTemplatePath = path.join(TEMPLATE_DIR, 'soniya_accessibility_config.xml');
  const xmlTargetPath = path.join(resXmlDirectory, 'soniya_accessibility_config.xml');
  const xmlContents = await fs.promises.readFile(xmlTemplatePath, 'utf8');
  await fs.promises.writeFile(xmlTargetPath, xmlContents);

  return nextConfig;
}]);

const addBridgePackageToMainApplication = (config) => withMainApplication(config, (nextConfig) => {
  const packageName = AndroidConfig.Package.getPackage(nextConfig);
  if (!packageName) {
    return nextConfig;
  }

  const bridgeImport = `import ${packageName}.soniya.SoniyaAndroidPackage`;
  const { modResults } = nextConfig;

  if (!modResults.contents.includes(bridgeImport)) {
    modResults.contents = modResults.contents.replace(/^(package\s+[\w.`]+[\r\n]+)/m, `$1\n${bridgeImport};\n`);
    modResults.contents = modResults.contents.replace(`${bridgeImport};`, bridgeImport);
  }

  if (modResults.language === 'kt') {
    if (!modResults.contents.includes('packages.add(SoniyaAndroidPackage())')) {
      if (modResults.contents.includes('PackageList(this).packages.apply {')) {
        modResults.contents = modResults.contents.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n              add(SoniyaAndroidPackage())'
        );
      } else {
        modResults.contents = modResults.contents.replace(
          'val packages = PackageList(this).packages',
          'val packages = PackageList(this).packages\n            packages.add(SoniyaAndroidPackage())'
        );
      }
    }
  } else if (!modResults.contents.includes('packages.add(new SoniyaAndroidPackage());')) {
    if (modResults.contents.includes('return new PackageList(this).getPackages();')) {
      modResults.contents = modResults.contents.replace(
        'return new PackageList(this).getPackages();',
        'List<ReactPackage> packages = new PackageList(this).getPackages();\n          packages.add(new SoniyaAndroidPackage());\n          return packages;'
      );
    } else {
      modResults.contents = modResults.contents.replace(
        'return packages;',
        'packages.add(new SoniyaAndroidPackage());\n            return packages;'
      );
    }
  }

  return nextConfig;
});

const withSoniyaAndroidBridge = (config) => {
  let nextConfig = config;
  nextConfig = ensureManifestEntries(nextConfig);
  nextConfig = writeNativeFiles(nextConfig);
  nextConfig = addBridgePackageToMainApplication(nextConfig);
  return nextConfig;
};

module.exports = createRunOncePlugin(withSoniyaAndroidBridge, PLUGIN_NAME, PLUGIN_VERSION);
