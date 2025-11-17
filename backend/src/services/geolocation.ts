import { logger } from '../utils/logger';

// Telangana state boundaries
export const TELANGANA_BOUNDS = {
  north: 19.9,
  south: 15.1,
  east: 81.5,
  west: 77.2
};

// Telangana districts with their approximate coordinates
export const TELANGANA_DISTRICTS = [
  { name: 'Adilabad', coordinates: [78.5, 19.7] },
  { name: 'Bhadradri Kothagudem', coordinates: [80.7, 17.6] },
  { name: 'Hanumakonda', coordinates: [79.6, 18.0] },
  { name: 'Hyderabad', coordinates: [78.5, 17.4] },
  { name: 'Jagtial', coordinates: [78.9, 18.8] },
  { name: 'Jangaon', coordinates: [79.0, 17.7] },
  { name: 'Jayashankar Bhupalpally', coordinates: [79.6, 18.0] },
  { name: 'Jogulamba Gadwal', coordinates: [77.8, 16.2] },
  { name: 'Kamareddy', coordinates: [78.3, 18.3] },
  { name: 'Karimnagar', coordinates: [79.1, 18.4] },
  { name: 'Khammam', coordinates: [80.2, 17.3] },
  { name: 'Kumuram Bheem', coordinates: [80.1, 19.4] },
  { name: 'Mahabubabad', coordinates: [79.9, 17.6] },
  { name: 'Mahabubnagar', coordinates: [78.0, 16.7] },
  { name: 'Mancherial', coordinates: [79.5, 18.9] },
  { name: 'Medak', coordinates: [78.3, 18.0] },
  { name: 'Medchal Malkajgiri', coordinates: [78.5, 17.5] },
  { name: 'Mulugu', coordinates: [80.0, 18.8] },
  { name: 'Nagarkurnool', coordinates: [78.3, 16.5] },
  { name: 'Nalgonda', coordinates: [79.2, 17.1] },
  { name: 'Narayanpet', coordinates: [78.0, 16.7] },
  { name: 'Nirmal', coordinates: [78.9, 19.1] },
  { name: 'Nizamabad', coordinates: [78.1, 18.7] },
  { name: 'Peddapalli', coordinates: [79.4, 18.6] },
  { name: 'Rajanna Sircilla', coordinates: [78.8, 18.4] },
  { name: 'Rangareddy', coordinates: [78.4, 17.2] },
  { name: 'Sangareddy', coordinates: [77.9, 17.6] },
  { name: 'Siddipet', coordinates: [78.8, 18.1] },
  { name: 'Suryapet', coordinates: [79.6, 17.2] },
  { name: 'Vikarabad', coordinates: [77.8, 17.0] },
  { name: 'Wanaparthy', coordinates: [78.1, 16.6] },
  { name: 'Warangal', coordinates: [79.6, 18.0] },
  { name: 'Yadadri Bhuvanagiri', coordinates: [78.9, 17.2] }
];

export interface LocationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface GeocodeResult {
  address: string;
  coordinates: [number, number];
  district?: string;
  mandal?: string;
  village?: string;
  landmark?: string;
  confidence: number;
}

export interface ReverseGeocodeResult {
  address: string;
  district: string;
  mandal?: string;
  village?: string;
  pincode?: string;
  state: string;
  country: string;
}

export interface NearbyLocation {
  name: string;
  type: string;
  coordinates: [number, number];
  distance: number;
}

export class GeolocationService {
  private googleMapsApiKey: string;

  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  // Validate coordinates are within Telangana bounds
  validateCoordinates(lat: number, lng: number): LocationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if coordinates are within reasonable bounds for India
    if (lat < 6 || lat > 38) {
      errors.push('Latitude is outside Indian subcontinent bounds');
    }
    if (lng < 68 || lng > 98) {
      errors.push('Longitude is outside Indian subcontinent bounds');
    }

    // Check if coordinates are within Telangana bounds
    if (lat < TELANGANA_BOUNDS.south || lat > TELANGANA_BOUNDS.north) {
      errors.push('Latitude is outside Telangana state bounds');
    } else if (lat < TELANGANA_BOUNDS.south + 0.5 || lat > TELANGANA_BOUNDS.north - 0.5) {
      warnings.push('Coordinates are near Telangana state boundary');
    }

    if (lng < TELANGANA_BOUNDS.west || lng > TELANGANA_BOUNDS.east) {
      errors.push('Longitude is outside Telangana state bounds');
    } else if (lng < TELANGANA_BOUNDS.west + 0.5 || lng > TELANGANA_BOUNDS.east - 0.5) {
      warnings.push('Coordinates are near Telangana state boundary');
    }

    // Suggest nearest district if outside bounds but close
    if ((errors.length > 0 || warnings.length > 0) && this.isNearTelangana(lat, lng)) {
      const nearestDistrict = this.findNearestDistrict(lat, lng);
      if (nearestDistrict) {
        suggestions.push(`Nearest Telangana district: ${nearestDistrict.name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  // Check if coordinates are near Telangana (within 50km)
  private isNearTelangana(lat: number, lng: number): boolean {
    const centerLat = (TELANGANA_BOUNDS.north + TELANGANA_BOUNDS.south) / 2;
    const centerLng = (TELANGANA_BOUNDS.east + TELANGANA_BOUNDS.west) / 2;

    const distance = this.calculateDistance(lat, lng, centerLat, centerLng);
    return distance <= 50; // 50km radius
  }

  // Find nearest district to given coordinates
  private findNearestDistrict(lat: number, lng: number): typeof TELANGANA_DISTRICTS[0] | null {
    let nearestDistrict = null;
    let minDistance = Infinity;

    for (const district of TELANGANA_DISTRICTS) {
      const distance = this.calculateDistance(
        lat, lng,
        district.coordinates[1], district.coordinates[0]
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestDistrict = district;
      }
    }

    return minDistance <= 100 ? nearestDistrict : null; // Within 100km
  }

  // Calculate distance between two coordinates in kilometers
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Convert degrees to radians
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Standardize address format
  standardizeAddress(address: string): string {
    if (!address) return '';

    return address
      .toLowerCase()
      .replace(/,\s*,/g, ',') // Remove double commas
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/,\s*$/, '') // Remove trailing comma
      .trim();
  }

  // Extract location components from address
  extractLocationComponents(address: string): {
    district?: string;
    mandal?: string;
    village?: string;
    pincode?: string;
    landmark?: string;
  } {
    const components: any = {};
    const standardizedAddress = this.standardizeAddress(address).toLowerCase();

    // Extract district
    for (const district of TELANGANA_DISTRICTS) {
      if (standardizedAddress.includes(district.name.toLowerCase())) {
        components.district = district.name;
        break;
      }
    }

    // Extract pincode (6-digit number)
    const pincodeMatch = standardizedAddress.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      components.pincode = pincodeMatch[0];
    }

    // Common mandal/village indicators
    const mandalIndicators = ['mandal', 'mandalam'];
    const villageIndicators = ['village', 'gram', 'palli', 'guda', 'pet'];

    // This is a simplified extraction - in production, you'd use more sophisticated NLP
    const words = standardizedAddress.split(/[\s,]+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check for mandal
      if (mandalIndicators.includes(word) && i > 0 && !components.mandal) {
        components.mandal = words[i - 1].charAt(0).toUpperCase() + words[i - 1].slice(1);
      }

      // Check for village
      if (villageIndicators.includes(word) && i > 0 && !components.village) {
        components.village = words[i - 1].charAt(0).toUpperCase() + words[i - 1].slice(1);
      }
    }

    return components;
  }

  // Geocode address to coordinates (mock implementation)
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      // In production, this would use Google Maps API or similar
      // For now, we'll return a mock result based on address parsing

      const components = this.extractLocationComponents(address);
      let coordinates: [number, number] = [78.5, 17.4]; // Default to Hyderabad

      // Find district coordinates if district is found
      if (components.district) {
        const district = TELANGANA_DISTRICTS.find(d => d.name === components.district);
        if (district) {
          coordinates = district.coordinates as [number, number];
        }
      }

      const confidence = components.district ? 0.8 : 0.3;

      return {
        address: address,
        coordinates,
        district: components.district,
        mandal: components.mandal,
        village: components.village,
        confidence
      };
    } catch (error) {
      logger.error('Geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  }

  // Reverse geocode coordinates to address (mock implementation)
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    try {
      // Validate coordinates
      const validation = this.validateCoordinates(lat, lng);
      if (!validation.isValid) {
        throw new Error('Coordinates are outside valid range');
      }

      // Find nearest district
      const nearestDistrict = this.findNearestDistrict(lat, lng);
      const district = nearestDistrict?.name || 'Unknown';

      return {
        address: `Near ${district}, Telangana, India`,
        district,
        state: 'Telangana',
        country: 'India'
      };
    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  // Find nearby locations (mock implementation)
  async findNearbyLocations(lat: number, lng: number, radiusKm: number = 5): Promise<NearbyLocation[]> {
    try {
      const nearby: NearbyLocation[] = [];

      // Find nearby districts
      for (const district of TELANGANA_DISTRICTS) {
        const distance = this.calculateDistance(
          lat, lng,
          district.coordinates[1], district.coordinates[0]
        );

        if (distance <= radiusKm) {
          nearby.push({
            name: district.name,
            type: 'district',
            coordinates: district.coordinates as [number, number],
            distance: Math.round(distance * 100) / 100
          });
        }
      }

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);

      return nearby.slice(0, 10); // Return top 10 nearby locations
    } catch (error) {
      logger.error('Find nearby locations error:', error);
      throw new Error('Failed to find nearby locations');
    }
  }

  // Generate cluster points for map visualization
  generateClusters(complaints: Array<{ coordinates: [number, number] }>, gridSize: number = 0.1): Array<{
    coordinates: [number, number];
    count: number;
    complaints: Array<{ coordinates: [number, number] }>;
  }> {
    const clusters = new Map<string, {
      coordinates: [number, number];
      count: number;
      complaints: Array<{ coordinates: [number, number] }>;
    }>();

    for (const complaint of complaints) {
      const [lng, lat] = complaint.coordinates;

      // Create grid key
      const latGrid = Math.floor(lat / gridSize) * gridSize;
      const lngGrid = Math.floor(lng / gridSize) * gridSize;
      const key = `${latGrid},${lngGrid}`;

      if (!clusters.has(key)) {
        clusters.set(key, {
          coordinates: [lngGrid + gridSize / 2, latGrid + gridSize / 2],
          count: 0,
          complaints: []
        });
      }

      const cluster = clusters.get(key)!;
      cluster.count++;
      cluster.complaints.push(complaint);
    }

    return Array.from(clusters.values());
  }

  // Check if coordinates are in water body area (mock implementation)
  async isInWaterBody(lat: number, lng: number): Promise<boolean> {
    // In production, this would use GIS data to check against water body boundaries
    // For now, return false (not in water body)
    return false;
  }

  // Get administrative hierarchy for coordinates
  async getAdministrativeHierarchy(lat: number, lng: number): Promise<{
    state: string;
    district: string;
    mandal?: string;
    village?: string;
    assemblyConstituency?: string;
    parliamentaryConstituency?: string;
  }> {
    try {
      const validation = this.validateCoordinates(lat, lng);
      if (!validation.isValid) {
        throw new Error('Coordinates are outside valid range');
      }

      const nearestDistrict = this.findNearestDistrict(lat, lng);

      return {
        state: 'Telangana',
        district: nearestDistrict?.name || 'Unknown'
        // In production, you'd get more detailed administrative data
      };
    } catch (error) {
      logger.error('Get administrative hierarchy error:', error);
      throw new Error('Failed to get administrative hierarchy');
    }
  }
}

// Export singleton instance
export const geolocationService = new GeolocationService();