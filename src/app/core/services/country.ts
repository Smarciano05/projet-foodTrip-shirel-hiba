import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Country {
  private apiUrl = 'https://countries.dev/countries';

  constructor(private http: HttpClient) {}

  getAllCountries() {
    return this.http.get<any[]>(this.apiUrl);
  }
}
