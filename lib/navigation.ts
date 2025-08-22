import { Linking, Alert } from 'react-native';

export interface NavigationCoordinate {
  lat: number;
  lng: number;
}

export interface NavigationOptions {
  start: NavigationCoordinate;
  dest: NavigationCoordinate;
  waypoint?: NavigationCoordinate;
}

/**
 * Opens Google Maps navigation with support for waypoints (delivery routes)
 * Falls back to web Google Maps if the app is not installed
 */
export async function openGoogleMapsNavigation(opts: NavigationOptions): Promise<void> {
  try {
    const hasApp = await Linking.canOpenURL('comgooglemaps://');
    const saddr = `${opts.start.lat},${opts.start.lng}`;
    const daddr = `${opts.dest.lat},${opts.dest.lng}`;
    const waypoint = opts.waypoint ? `${opts.waypoint.lat},${opts.waypoint.lng}` : undefined;

    let url: string;

    if (waypoint) {
      // Multi-stop route (pickup -> delivery)
      if (hasApp) {
        url = `comgooglemaps://?saddr=${saddr}&daddr=${daddr}&waypoints=${waypoint}&directionsmode=driving`;
      } else {
        url = `https://www.google.com/maps/dir/${encodeURIComponent(saddr)}/${encodeURIComponent(waypoint)}/${encodeURIComponent(daddr)}/`;
      }
    } else {
      // Direct route
      if (hasApp) {
        url = `comgooglemaps://?saddr=${saddr}&daddr=${daddr}&directionsmode=driving`;
      } else {
        url = `https://www.google.com/maps/dir/${encodeURIComponent(saddr)}/${encodeURIComponent(daddr)}/`;
      }
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open Google Maps:', error);
    Alert.alert(
      'Navigation Error',
      'Unable to open Google Maps. Please check if the app is installed or try again.',
      [{ text: 'OK' }]
    );
  }
}

/**
 * Opens Google Maps to show a specific location
 */
export async function openGoogleMapsLocation(coordinate: NavigationCoordinate, label?: string): Promise<void> {
  try {
    const hasApp = await Linking.canOpenURL('comgooglemaps://');
    const coords = `${coordinate.lat},${coordinate.lng}`;
    
    let url: string;
    if (hasApp) {
      url = `comgooglemaps://?q=${coords}${label ? `(${encodeURIComponent(label)})` : ''}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open Google Maps location:', error);
    Alert.alert(
      'Navigation Error',
      'Unable to open Google Maps. Please check if the app is installed or try again.',
      [{ text: 'OK' }]
    );
  }
}