import { AppState, Alert } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Service to manage instant Over-The-Air (OTA) updates via Expo EAS Update
 */

let isCurrentlyChecking = false;

export function getAppUpdateInfo() {
  try {
    return {
      channel: Updates.channel || 'production',
      runtimeVersion: Updates.runtimeVersion || '1.0.0',
      updateId: Updates.updateId || 'embedded',
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      manifest: Updates.manifest,
    };
  } catch (e) {
    return {
      channel: 'production',
      runtimeVersion: '1.0.0',
      updateId: 'embedded',
      isEmbeddedLaunch: true,
    };
  }
}

/**
 * Check and apply update automatically
 */
export async function checkAndApplyUpdate(onStatusChange = null) {
  if (__DEV__) return false;
  if (isCurrentlyChecking) return false;

  isCurrentlyChecking = true;
  try {
    if (onStatusChange) onStatusChange('checking');
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      if (onStatusChange) onStatusChange('downloading');
      await Updates.fetchUpdateAsync();

      if (onStatusChange) onStatusChange('ready');
      setTimeout(async () => {
        try {
          await Updates.reloadAsync();
        } catch (err) {
          console.warn('Reload error:', err);
        }
      }, 800);
      return true;
    } else {
      if (onStatusChange) onStatusChange(null);
      return false;
    }
  } catch (error) {
    console.log('EAS Update check warning:', error.message);
    if (onStatusChange) onStatusChange(null);
    return false;
  } finally {
    isCurrentlyChecking = false;
  }
}

/**
 * Manually trigger update check from the UI with full alert feedback
 */
export async function manualCheckForUpdate() {
  if (__DEV__) {
    Alert.alert('Development Mode', 'EAS Updates are only active in standalone APK/production builds, not in local Expo Go/dev mode.');
    return;
  }

  try {
    const info = getAppUpdateInfo();
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      Alert.alert(
        '🔄 New Update Available!',
        `A new version is available on channel [${info.channel}]. Downloading and applying update now...`,
        [
          {
            text: 'Apply & Restart',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                Alert.alert('Update Error', e.message);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        '✅ App is Up to Date',
        `You are running the latest version.\n\nChannel: ${info.channel}\nRuntime: ${info.runtimeVersion}\nUpdate: ${info.updateId?.substring(0, 8) || 'embedded'}`
      );
    }
  } catch (error) {
    Alert.alert('Update Notice', 'Could not reach update server. Checking fallback: ' + error.message);
  }
}
