import { HttpClient, HttpParams } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

interface CuisineOption {
  label: string;
  tag: string;
}

interface AddressSearchResult {
  features?: Array<{
    geometry: { coordinates: [number, number] };
    properties: { label: string };
  }>;
}

interface OverpassRestaurant {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    cuisine?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
  };
}

const CUISINES: CuisineOption[] = [
  { label: 'Française', tag: 'french' },
  { label: 'Italienne', tag: 'italian' },
  { label: 'Japonaise', tag: 'japanese' },
  { label: 'Chinoise', tag: 'chinese' },
  { label: 'Indienne', tag: 'indian' },
  { label: 'Mexicaine', tag: 'mexican' },
  { label: 'Thaïlandaise', tag: 'thai' },
  { label: 'Marocaine', tag: 'moroccan' },
  { label: 'Libanaise', tag: 'lebanese' },
  { label: 'Turque', tag: 'turkish' },
  { label: 'Espagnole', tag: 'spanish' },
  { label: 'Vietnamienne', tag: 'vietnamese' },
  { label: 'Coréenne', tag: 'korean' },
  { label: 'Grecque', tag: 'greek' },
  { label: 'Américaine', tag: 'american' },
];

const SEARCH_RADIUS_METERS = 3000;
const INITIAL_CENTER: L.LatLngExpression = [46.603354, 1.888334];
const RESTAURANT_MARKER_ICON = L.icon({
  iconUrl: '/restaurant.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36],
});

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map implements AfterViewInit, OnDestroy {
  address = '';
  selectedCuisine = '';
  readonly cuisines = CUISINES;
  loading = false;
  status = '';
  resultCount: number | null = null;

  private map?: L.Map;
  private restaurantMarkers?: L.LayerGroup;
  private addressMarker?: L.Marker;
  private searchId = 0;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.map = L.map('map').setView(INITIAL_CENTER, 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.restaurantMarkers = L.layerGroup().addTo(this.map);
  }

  ngOnDestroy(): void {
    this.searchId++;
    this.map?.remove();
  }

  searchRestaurants(): void {
    const address = this.address.trim();
    if (!address || this.loading) {
      return;
    }

    const currentSearchId = ++this.searchId;
    this.loading = true;
    this.status = 'Recherche de l’adresse…';
    this.resultCount = null;

    this.http
      .get<AddressSearchResult>('https://api-adresse.data.gouv.fr/search/', {
        params: { q: address, limit: '1' },
      })
      .subscribe({
        next: (result) => {
          if (currentSearchId !== this.searchId) {
            return;
          }

          const feature = result.features?.[0];
          if (!feature) {
            this.loading = false;
            this.status = 'Adresse introuvable. Essaie une adresse en France plus précise.';
            return;
          }

          const [lon, lat] = feature.geometry.coordinates;
          const map = this.map;
          if (!map || !this.restaurantMarkers) {
            this.loading = false;
            this.status = 'La carte ne peut pas être initialisée. Recharge la page et réessaie.';
            return;
          }

          map.setView([lat, lon], 14);
          this.restaurantMarkers.clearLayers();
          this.addressMarker?.remove();
          this.addressMarker = L.marker([lat, lon])
            .bindPopup(this.createPopup(feature.properties.label, 'Adresse recherchée'))
            .addTo(map);
          this.status = 'Recherche des restaurants à proximité…';
          this.loadRestaurants(lat, lon, currentSearchId);
        },
        error: () => {
          if (currentSearchId !== this.searchId) {
            return;
          }

          this.loading = false;
          this.status = 'Impossible de rechercher cette adresse pour le moment. Réessaie.';
        },
      });
  }

  private loadRestaurants(lat: number, lon: number, currentSearchId: number): void {
    const markers = this.restaurantMarkers;
    if (!markers) {
      this.loading = false;
      this.status = 'La carte ne peut pas être initialisée. Recharge la page et réessaie.';
      return;
    }

    const cuisineFilter = this.selectedCuisine
      ? `["cuisine"~"${this.selectedCuisine}",i]`
      : '';
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"]${cuisineFilter}(around:${SEARCH_RADIUS_METERS},${lat},${lon});
        way["amenity"="restaurant"]${cuisineFilter}(around:${SEARCH_RADIUS_METERS},${lat},${lon});
        relation["amenity"="restaurant"]${cuisineFilter}(around:${SEARCH_RADIUS_METERS},${lat},${lon});
      );
      out center tags;
    `;
    const body = new HttpParams().set('data', query);

    this.http
      .post<{ elements?: OverpassRestaurant[] }>(
        'https://overpass-api.de/api/interpreter',
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      .subscribe({
        next: (result) => {
          if (currentSearchId !== this.searchId) {
            return;
          }

          markers.clearLayers();
          const restaurants = result.elements ?? [];
          let markerCount = 0;

          for (const restaurant of restaurants) {
            const restaurantLat = restaurant.lat ?? restaurant.center?.lat;
            const restaurantLon = restaurant.lon ?? restaurant.center?.lon;
            if (restaurantLat == null || restaurantLon == null) {
              continue;
            }

            const name = restaurant.tags?.name || 'Restaurant sans nom';
            const street = restaurant.tags?.['addr:street'];
            const houseNumber = restaurant.tags?.['addr:housenumber'];
            const address = [houseNumber, street].filter(Boolean).join(' ');
            const popup = this.createPopup(
              name,
              address || restaurant.tags?.cuisine || 'Restaurant',
            );

            L.marker([restaurantLat, restaurantLon], {
              icon: RESTAURANT_MARKER_ICON,
              title: name,
              alt: name,
              keyboard: true,
            })
              .bindPopup(popup)
              .addTo(markers);
            markerCount++;
          }

          this.loading = false;
          this.resultCount = markerCount;
          this.status = markerCount
            ? `${markerCount} restaurant${markerCount > 1 ? 's' : ''} trouvé${markerCount > 1 ? 's' : ''} dans un rayon de 3 km.`
            : 'Aucun restaurant correspondant trouvé dans un rayon de 3 km.';
        },
        error: () => {
          if (currentSearchId !== this.searchId) {
            return;
          }

          this.loading = false;
          this.status = 'La recherche OpenStreetMap a échoué. Réessaie dans quelques instants.';
        },
      });
  }

  private createPopup(title: string, detail: string): HTMLElement {
    const container = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const description = document.createElement('div');
    description.textContent = detail;
    container.append(heading, description);
    return container;
  }
}
