
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, throwError } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet.markercluster';

interface CuisineOption {
  label: string;
  tag: string;
}

interface AddressSearchResult {
  features?: Array<{
    geometry: {
      coordinates: [number, number];
    };
    properties: {
      name?: string;
      housenumber?: string;
      street?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }>;
}

interface OverpassRestaurant {
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    cuisine?: string;
    'addr:full'?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:place'?: string;
    'addr:postcode'?: string;
    'addr:city'?: string;
    'addr:country'?: string;
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
  { label: 'Américaine', tag: 'american' }
];

const SEARCH_RADIUS_METERS = 3000;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const INITIAL_CENTER: L.LatLngExpression = [
  46.603354,
  1.888334
];

// Icône de l'adresse recherchée
const ADDRESS_MARKER_ICON = L.icon({
  iconUrl: '/restaurant.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36]
});

// Icône des restaurants
const RESTAURANT_MARKER_ICON = L.icon({
  iconUrl: '/restaurant-rechercher.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36]
});

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './map.html',
  styleUrl: './map.scss'
})
export class Map implements AfterViewInit, OnDestroy {

  address = '';
  selectedCuisine = '';

  readonly cuisines = CUISINES;

  loading = false;
  status = '';
  resultCount: number | null = null;

  private map?: L.Map;
  private restaurantMarkers?: L.MarkerClusterGroup;
  private addressMarker?: L.Marker;

  private searchId = 0;

  constructor(private http: HttpClient) {}

  // Initialisation de la carte
  ngAfterViewInit(): void {

    this.map = L.map('map').setView(INITIAL_CENTER, 6);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }
    ).addTo(this.map);

    // Couche réservée aux restaurants
    this.restaurantMarkers = L.markerClusterGroup({
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    }).addTo(this.map);
  }

  // Nettoyage
  ngOnDestroy(): void {
    this.searchId++;
    this.map?.remove();
  }

  // Recherche de l'adresse
  searchRestaurants(): void {

    const address = this.address.trim();

    if (!address || this.loading) {
      return;
    }

    const currentSearchId = ++this.searchId;

    this.loading = true;
    this.status = 'Recherche de l’adresse...';
    this.resultCount = null;

    const params = new HttpParams()
      .set('q', address)
      .set('limit', '1');

    this.http.get<AddressSearchResult>(
      'https://photon.komoot.io/api/',
      { params }
    ).subscribe({

      next: (result) => {

        if (currentSearchId !== this.searchId) {
          return;
        }

        const feature = result.features?.[0];

        if (!feature) {
          this.loading = false;
          this.status = 'Adresse ou lieu introuvable.';
          return;
        }

        const [lon, lat] = feature.geometry.coordinates;

        const location = feature.properties;

        const streetAddress = [
          location.housenumber,
          location.street
        ].filter(Boolean).join(' ');

        const label = [
          location.name,
          streetAddress,
          location.city,
          location.state,
          location.country
        ]
          .filter((part, index, parts): part is string =>
            Boolean(part) && parts.indexOf(part) === index
          )
          .join(', ');

        const map = this.map;

        if (!map || !this.restaurantMarkers) {
          this.loading = false;
          this.status = 'La carte ne peut pas être initialisée.';
          return;
        }

        // Centrage sur l'adresse recherchée
        map.setView([lat, lon], 14);

        // Supprimer les anciens restaurants
        this.restaurantMarkers.clearLayers();

        // Supprimer l'ancien marqueur d'adresse
        this.addressMarker?.remove();

        // Ajouter le marqueur de l'adresse
        this.addressMarker = L.marker([lat, lon], {
          icon: ADDRESS_MARKER_ICON,
          title: 'Adresse recherchée',
          alt: 'Adresse recherchée'
        })
          .bindPopup(
            this.createPopup(
              label || address,
              'Adresse recherchée'
            )
          )
          .addTo(map);

        this.addressMarker.openPopup();

        // Rechercher les restaurants
        this.status = 'Recherche des restaurants à proximité...';

        this.loadRestaurants(lat, lon, currentSearchId);
      },

      error: () => {

        if (currentSearchId !== this.searchId) {
          return;
        }

        this.loading = false;
        this.status =
          'Impossible de rechercher cette adresse. Réessaie.';
      }
    });
  }

  // Recherche des restaurants avec Overpass
  private loadRestaurants(
    lat: number,
    lon: number,
    currentSearchId: number
  ): void {

    const markers = this.restaurantMarkers;

    if (!markers) {
      this.loading = false;
      this.status = 'La carte ne peut pas être initialisée.';
      return;
    }

    const cuisineFilter = this.selectedCuisine
      ? `["cuisine"~"${this.selectedCuisine}",i]`
      : '';

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"]${cuisineFilter}
          (around:${SEARCH_RADIUS_METERS},${lat},${lon});

        way["amenity"="restaurant"]${cuisineFilter}
          (around:${SEARCH_RADIUS_METERS},${lat},${lon});

        relation["amenity"="restaurant"]${cuisineFilter}
          (around:${SEARCH_RADIUS_METERS},${lat},${lon});
      );
      out center tags;
    `;

    this.requestOverpass(query).subscribe({

      next: (result) => {

        if (currentSearchId !== this.searchId) {
          return;
        }

        // Nettoyer les anciens marqueurs restaurants
        markers.clearLayers();

        const restaurants = result.elements ?? [];

        let markerCount = 0;

        for (const restaurant of restaurants) {

          const restaurantLat =
            restaurant.lat ?? restaurant.center?.lat;

          const restaurantLon =
            restaurant.lon ?? restaurant.center?.lon;

          if (
            restaurantLat == null ||
            restaurantLon == null
          ) {
            continue;
          }

          const name =
            restaurant.tags?.name || 'Restaurant sans nom';

          const tags = restaurant.tags;
          const streetAddress = [
            tags?.['addr:housenumber'],
            tags?.['addr:street'] || tags?.['addr:place'],
          ].filter(Boolean).join(' ');
          const address = tags?.['addr:full'] || [
            streetAddress,
            tags?.['addr:postcode'],
            tags?.['addr:city'],
            tags?.['addr:country'],
          ].filter(Boolean).join(', ');
          const popup = this.createRestaurantPopup(
            name,
            address || 'Adresse non renseignée dans OpenStreetMap',
            tags?.cuisine || 'Type de cuisine non renseigné',
          );

          // Ajouter le marqueur du restaurant
          L.marker(
            [restaurantLat, restaurantLon],
            {
              icon: RESTAURANT_MARKER_ICON,
              title: name,
              alt: name,
              keyboard: true
            }
          )
            .bindPopup(popup)
            .addTo(markers);

          markerCount++;
        }

        this.loading = false;
        this.resultCount = markerCount;

        this.status = markerCount
          ? `${markerCount} restaurant(s) trouvé(s) dans un rayon de 3 km.`
          : 'Aucun restaurant trouvé dans un rayon de 3 km.';
      },

      error: (error: HttpErrorResponse) => {

        if (currentSearchId !== this.searchId) {
          return;
        }

        this.loading = false;
        this.status = error.status === 502 || error.status === 504
          ? 'Les services de recherche OpenStreetMap sont temporairement indisponibles. Réessaie dans quelques instants.'
          : error.status === 0
            ? 'Impossible de joindre les services OpenStreetMap. Vérifie ta connexion et réessaie.'
            : `La recherche OpenStreetMap a échoué (HTTP ${error.status}). Réessaie dans quelques instants.`;
      }
    });
  }

  private requestOverpass(
    query: string,
    endpointIndex = 0
  ): Observable<{ elements?: OverpassRestaurant[] }> {
    const body = new HttpParams().set('data', query);
    const request = this.http.post<{ elements?: OverpassRestaurant[] }>(
      OVERPASS_ENDPOINTS[endpointIndex],
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return request.pipe(
      catchError((error: HttpErrorResponse) => {
        if (endpointIndex + 1 >= OVERPASS_ENDPOINTS.length) {
          return throwError(() => error);
        }
        return this.requestOverpass(query, endpointIndex + 1);
      })
    );
  }

  // Création des fenêtres popup
  private createPopup(
    title: string,
    detail: string
  ): HTMLElement {

    const container = document.createElement('div');

    const heading = document.createElement('strong');
    heading.textContent = title;

    const description = document.createElement('div');
    description.textContent = detail;

    container.append(heading, description);

    return container;
  }

  private createRestaurantPopup(
    name: string,
    address: string,
    cuisine: string,
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'foodtrip-restaurant-popup';

    const heading = document.createElement('strong');
    heading.className = 'foodtrip-restaurant-popup__name';
    heading.textContent = name;

    const addressLine = document.createElement('div');
    addressLine.className = 'foodtrip-restaurant-popup__address';
    addressLine.textContent = `Adresse : ${address}`;

    const cuisineLine = document.createElement('div');
    cuisineLine.className = 'foodtrip-restaurant-popup__cuisine';
    cuisineLine.textContent = `Cuisine : ${cuisine}`;

    container.append(heading, addressLine, cuisineLine);
    return container;
  }
}
