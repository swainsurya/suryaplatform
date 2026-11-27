import { Linking, Platform } from 'react-native';
import {
  Camera,
  PermissionResponse,
  PermissionStatus,
} from 'expo-camera';

export interface CameraPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: PermissionStatus;
  needsSettings: boolean;
}

/**
 * Checks current camera permission status without prompting
 */
export async function checkCameraPermission(): Promise<CameraPermissionResult> {
  try {
    const res: PermissionResponse = await Camera.getCameraPermissionsAsync();
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
      needsSettings: !res.granted && !res.canAskAgain,
    };
  } catch (error) {
    console.warn('Error checking camera permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: PermissionStatus.UNDETERMINED,
      needsSettings: false,
    };
  }
}

/**
 * Prompts user for camera permission using Expo Camera.
 * If permission was previously permanently denied (canAskAgain === false),
 * it flags needsSettings so the UI can provide an "Open Settings" action.
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  try {
    const current = await Camera.getCameraPermissionsAsync();
    if (current.granted) {
      return {
        granted: true,
        canAskAgain: current.canAskAgain,
        status: current.status,
        needsSettings: false,
      };
    }

    // If OS has permanently blocked requests, prompt user to open Settings
    if (!current.canAskAgain && current.status === PermissionStatus.DENIED) {
      return {
        granted: false,
        canAskAgain: false,
        status: current.status,
        needsSettings: true,
      };
    }

    // Ask user for permission directly through Expo Camera
    const res: PermissionResponse = await Camera.requestCameraPermissionsAsync();
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
      needsSettings: !res.granted && !res.canAskAgain,
    };
  } catch (error) {
    console.warn('Error requesting camera permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      status: PermissionStatus.UNDETERMINED,
      needsSettings: false,
    };
  }
}

/**
 * Opens system application settings so the student can toggle camera access manually
 */
export async function openDeviceSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.warn('Error opening app settings:', error);
  }
}
