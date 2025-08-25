const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCrVIRCIog1gFNc_KFF669XaaebfdxUgn8';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name?: string;
  coordinates: Coordinates;
  types: string[];
}

export interface CampusLocation {
  name: string;
  address: string;
  coordinates: Coordinates;
  type: 'dining_hall' | 'food_court' | 'library' | 'gym' | 'store' | 'building';
}

// Enhanced UF Campus locations with accurate coordinates
export const UF_CAMPUS_LOCATIONS: CampusLocation[] = [
  // Dining Halls
  {
    name: 'Broward Dining',
    address: '1 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6485, longitude: -82.3434 },
    type: 'dining_hall'
  },
  {
    name: 'Gator Corner Dining Center',
    address: '1849 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6436, longitude: -82.3549 },
    type: 'dining_hall'
  },
  {
    name: 'Fresh Food Company',
    address: '505 Newell Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6473, longitude: -82.3444 },
    type: 'dining_hall'
  },
  
  // Food Courts & Restaurants
  {
    name: 'Reitz Union Food Court',
    address: '686 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6465, longitude: -82.3473 },
    type: 'food_court'
  },
  {
    name: 'Hub Food Court',
    address: '3025 SW 23rd St, Gainesville, FL 32608',
    coordinates: { latitude: 29.6234, longitude: -82.3678 },
    type: 'food_court'
  },
  {
    name: 'Starbucks - Library West',
    address: '1545 W University Ave, Gainesville, FL 32603',
    coordinates: { latitude: 29.6516, longitude: -82.3442 },
    type: 'store'
  },
  {
    name: 'Chipotle - Archer Road',
    address: '3832 SW Archer Rd, Gainesville, FL 32608',
    coordinates: { latitude: 29.6234, longitude: -82.3678 },
    type: 'store'
  },
  {
    name: 'Chick-fil-A - Reitz Union',
    address: '686 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6465, longitude: -82.3473 },
    type: 'store'
  },
  {
    name: 'Panda Express - Reitz Union',
    address: '686 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6465, longitude: -82.3473 },
    type: 'food_court'
  },
  {
    name: 'Subway - Hub',
    address: '3025 SW 23rd St, Gainesville, FL 32608',
    coordinates: { latitude: 29.6234, longitude: -82.3678 },
    type: 'food_court'
  },
  {
    name: 'Taco Bell - Reitz Union',
    address: '686 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6465, longitude: -82.3473 },
    type: 'food_court'
  },
  {
    name: 'Einstein Bros Bagels - Library West',
    address: '1545 W University Ave, Gainesville, FL 32603',
    coordinates: { latitude: 29.6516, longitude: -82.3442 },
    type: 'store'
  },
  {
    name: 'Pollo Tropical - Reitz Union',
    address: '686 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6465, longitude: -82.3473 },
    type: 'food_court'
  },
  
  // Popular Campus Buildings
  {
    name: 'Marston Science Library',
    address: '444 Newell Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6516, longitude: -82.3442 },
    type: 'library'
  },
  {
    name: 'Student Recreation & Fitness Center',
    address: '1864 Stadium Rd, Gainesville, FL 32603',
    coordinates: { latitude: 29.6497, longitude: -82.3486 },
    type: 'gym'
  },
  {
    name: 'Turlington Hall',
    address: '330 Newell Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6508, longitude: -82.3417 },
    type: 'building'
  },
  {
    name: 'Ben Hill Griffin Stadium',
    address: '157 Gale Lemerand Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6499, longitude: -82.3487 },
    type: 'building'
  },
  {
    name: 'Plaza of the Americas',
    address: 'Plaza of the Americas, Gainesville, FL 32611',
    coordinates: { latitude: 29.6480, longitude: -82.3434 },
    type: 'building'
  },
  {
    name: 'Library West',
    address: '1545 W University Ave, Gainesville, FL 32603',
    coordinates: { latitude: 29.6516, longitude: -82.3442 },
    type: 'library'
  },
  {
    name: 'Architecture Building',
    address: '1480 Inner Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6501, longitude: -82.3398 },
    type: 'building'
  },
  {
    name: 'Business Administration Building',
    address: '1398 Stadium Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6489, longitude: -82.3421 },
    type: 'building'
  },
  {
    name: 'Engineering Building',
    address: '1949 Stadium Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6435, longitude: -82.3478 },
    type: 'building'
  },
  {
    name: 'Journalism Building',
    address: '2096 Weimer Hall, Gainesville, FL 32611',
    coordinates: { latitude: 29.6512, longitude: -82.3456 },
    type: 'building'
  },
  {
    name: 'Student Health Care Center',
    address: '280 Fletcher Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6445, longitude: -82.3512 },
    type: 'building'
  },
  {
    name: 'Beaty Towers',
    address: '1800 Museum Rd, Gainesville, FL 32611',
    coordinates: { latitude: 29.6478, longitude: -82.3523 },
    type: 'building'
  },
  {
    name: 'Jennings Hall',
    address: '125 Jennings Dr, Gainesville, FL 32611',
    coordinates: { latitude: 29.6502, longitude: -82.3445 },
    type: 'building'
  },
  {
    name: 'Norman Hall',
    address: '1403 Norman Hall, Gainesville, FL 32611',
    coordinates: { latitude: 29.6467, longitude: -82.3389 },
    type: 'building'
  },
  {
    name: 'Smathers Library',
    address: '1 Library E, Gainesville, FL 32611',
    coordinates: { latitude: 29.6516, longitude: -82.3442 },
    type: 'library'
  },
];

export class GeocodingService {
  /**
   * Geocode an address to get coordinates using Google Maps API
   */
  static async geocodeAddress(address: string): Promise<{ data: Coordinates | null; error: string | null }> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:US|administrative_area:FL&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          data: {
            latitude: location.lat,
            longitude: location.lng,
          },
          error: null,
        };
      } else if (data.status === 'ZERO_RESULTS') {
        return {
          data: null,
          error: 'Address not found. Please check the address and try again.',
        };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          data: null,
          error: 'Too many requests. Please try again later.',
        };
      } else {
        return {
          data: null,
          error: 'Unable to find location. Please try a different address.',
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        data: null,
        error: 'Failed to find location. Please check your internet connection.',
      };
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  static async reverseGeocode(coordinates: Coordinates): Promise<{ data: string | null; error: string | null }> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return {
          data: data.results[0].formatted_address,
          error: null,
        };
      } else {
        return {
          data: null,
          error: 'Unable to find address for this location.',
        };
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        data: null,
        error: 'Failed to get address. Please check your internet connection.',
      };
    }
  }

  /**
   * Search for places near UF campus using Google Places API
   */
  static async searchPlaces(query: string, location?: Coordinates): Promise<{ data: PlaceDetails[] | null; error: string | null }> {
    try {
      const searchLocation = location || { latitude: 29.6436, longitude: -82.3549 }; // UF campus center
      
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${searchLocation.latitude},${searchLocation.longitude}&radius=5000&key=${GOOGLE_MAPS_API_KEY}`;
      
      // Use a CORS proxy for web requests
      const proxyUrl = Platform.OS === 'web' 
        ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        : url;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.status === 'OK') {
        const places: PlaceDetails[] = data.results.map((place: any) => ({
          place_id: place.place_id!,
          formatted_address: place.formatted_address!,
          name: place.name,
          coordinates: {
            latitude: place.geometry!.location.lat,
            longitude: place.geometry!.location.lng,
          },
          types: place.types || [],
        }));

        return { data: places, error: null };
      } else if (data.status === 'ZERO_RESULTS') {
        return { data: [], error: null };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        return { data: null, error: 'Search limit reached. Please try again later.' };
      } else {
        return { data: [], error: null };
      }
    } catch (error) {
      console.error('Places search error:', error);
      return {
        data: null,
        error: 'Failed to search places. Please check your internet connection.',
      };
    }
  }

  /**
   * Get campus locations by type
   */
  static getCampusLocationsByType(type: CampusLocation['type']): CampusLocation[] {
    return UF_CAMPUS_LOCATIONS.filter(location => location.type === type);
  }

  /**
   * Find nearest campus location to coordinates
   */
  static findNearestCampusLocation(coordinates: Coordinates): CampusLocation | null {
    if (UF_CAMPUS_LOCATIONS.length === 0) return null;

    let nearest = UF_CAMPUS_LOCATIONS[0];
    let minDistance = this.calculateDistance(coordinates, nearest.coordinates);

    for (const location of UF_CAMPUS_LOCATIONS) {
      const distance = this.calculateDistance(coordinates, location.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    }

    return nearest;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get estimated travel time between coordinates
   */
  static getEstimatedTravelTime(coord1: Coordinates, coord2: Coordinates, mode: 'walking' | 'driving' = 'walking'): number {
    const distance = this.calculateDistance(coord1, coord2);
    
    if (mode === 'walking') {
      return Math.round(distance * 12); // ~12 minutes per km walking
    } else {
      return Math.round(distance * 2.5); // ~2.5 minutes per km driving on campus
    }
  }

  /**
   * Check if coordinates are within UF campus bounds
   */
  static isWithinCampus(coordinates: Coordinates): boolean {
    const campusCenter = { latitude: 29.6436, longitude: -82.3549 };
    const distance = this.calculateDistance(coordinates, campusCenter);
    return distance <= 5; // Within 5km of campus center
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}