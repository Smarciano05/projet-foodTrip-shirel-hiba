import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map implements AfterViewInit {
  address = '';

  private map!: L.Map;
  private markers = L.layerGroup();

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.map = L.map('map').setView([48.8566, 2.3522], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markers.addTo(this.map);

    L.marker([48.8566, 2.3522]).addTo(this.map).bindPopup('Paris');
  }

  searchRestaurants(): void {
    if (!this.address.trim()) {
      alert('Veuillez saisir une adresse.');
      return;
    }

    // 1. Transformer l'adresse en coordonnées GPS
    this.http
      .get<any>('https://api-adresse.data.gouv.fr/search/', {
        params: { q: this.address, limit: '1' },
      })
      .subscribe({
        next: (result) => {
          if (!result.features?.length) {
            alert('Adresse introuvable.');
            return;
          }

          const coordinates = result.features[0].geometry.coordinates;
          const lon = coordinates[0];
          const lat = coordinates[1];

          this.map.setView([lat, lon], 15);

          // 2. Chercher les restaurants autour de cette adresse
          this.loadRestaurants(lat, lon);
        },
        error: () => alert('Erreur lors de la recherche de l’adresse.'),
      });
  }

  private loadRestaurants(lat: number, lon: number): void {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:5000,${lat},${lon});
        way["amenity"="restaurant"](around:5000,${lat},${lon});
      );
      out center;
    `;

    this.http
      .get<any>('https://overpass-api.de/api/interpreter', { params: { data: query } })
      .subscribe({
        next: (result) => {
          this.markers.clearLayers();

          const restaurants = result.elements || [];

          restaurants.forEach((restaurant: any) => {
            const restaurantLat = restaurant.lat ?? restaurant.center?.lat;
            const restaurantLon = restaurant.lon ?? restaurant.center?.lon;

            if (restaurantLat == null || restaurantLon == null) {
              return;
            }

            const name = restaurant.tags?.name || 'Restaurant sans nom';

            L.marker([restaurantLat, restaurantLon])
              .bindPopup(`<strong>${name}</strong>`)
              .addTo(this.markers);
          });

          if (restaurants.length === 0) {
            alert('Aucun restaurant trouvé dans les environs.');
          }
        },
        error: () => alert('Erreur lors de la récupération des restaurants.'),
      });
  }
}
