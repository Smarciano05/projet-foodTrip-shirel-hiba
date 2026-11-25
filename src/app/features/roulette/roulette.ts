import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MealApi } from '../../core/services/meal-api';

interface WheelCountry {
  name: string;
  area: string;
  flag: string;
  capital?: string;
  region?: string;
}

const VERIFIED_DESTINATIONS: WheelCountry[] = [
  { area: 'Algerian', name: 'Algeria', flag: '🇩🇿', capital: 'Alger', region: 'Afrique' },
  { area: 'Australian', name: 'Australia', flag: '🇦🇺', capital: 'Canberra', region: 'Océanie' },
  { area: 'British', name: 'United Kingdom', flag: '🇬🇧', capital: 'Londres', region: 'Europe' },
  { area: 'Canadian', name: 'Canada', flag: '🇨🇦', capital: 'Ottawa', region: 'Amérique du Nord' },
  { area: 'Chinese', name: 'China', flag: '🇨🇳', capital: 'Pékin', region: 'Asie' },
  { area: 'Croatian', name: 'Croatia', flag: '🇭🇷', capital: 'Zagreb', region: 'Europe' },
  { area: 'Egyptian', name: 'Egypt', flag: '🇪🇬', capital: 'Le Caire', region: 'Afrique' },
  { area: 'Filipino', name: 'Philippines', flag: '🇵🇭', capital: 'Manille', region: 'Asie' },
  { area: 'Greek', name: 'Greece', flag: '🇬🇷', capital: 'Athènes', region: 'Europe' },
  { area: 'Irish', name: 'Ireland', flag: '🇮🇪', capital: 'Dublin', region: 'Europe' },
  { area: 'Italian', name: 'Italy', flag: '🇮🇹', capital: 'Rome', region: 'Europe' },
  { area: 'Jamaican', name: 'Jamaica', flag: '🇯🇲', capital: 'Kingston', region: 'Amérique du Nord' },
  { area: 'Japanese', name: 'Japan', flag: '🇯🇵', capital: 'Tokyo', region: 'Asie' },
  { area: 'Kenyan', name: 'Kenya', flag: '🇰🇪', capital: 'Nairobi', region: 'Afrique' },
  { area: 'Malaysian', name: 'Malaysia', flag: '🇲🇾', capital: 'Kuala Lumpur', region: 'Asie' },
  { area: 'Mexican', name: 'Mexico', flag: '🇲🇽', capital: 'Mexico', region: 'Amérique du Nord' },
  { area: 'Moroccan', name: 'Morocco', flag: '🇲🇦', capital: 'Rabat', region: 'Afrique' },
  { area: 'Polish', name: 'Poland', flag: '🇵🇱', capital: 'Varsovie', region: 'Europe' },
  { area: 'Portuguese', name: 'Portugal', flag: '🇵🇹', capital: 'Lisbonne', region: 'Europe' },
  { area: 'Russian', name: 'Russia', flag: '🇷🇺', capital: 'Moscou', region: 'Europe' },
  { area: 'Saudi Arabian', name: 'Saudi Arabia', flag: '🇸🇦', capital: 'Riyad', region: 'Asie' },
  { area: 'Spanish', name: 'Spain', flag: '🇪🇸', capital: 'Madrid', region: 'Europe' },
  { area: 'Syrian', name: 'Syria', flag: '🇸🇾', capital: 'Damas', region: 'Asie' },
  { area: 'Thai', name: 'Thailand', flag: '🇹🇭', capital: 'Bangkok', region: 'Asie' },
  { area: 'Tunisian', name: 'Tunisia', flag: '🇹🇳', capital: 'Tunis', region: 'Afrique' },
  { area: 'Turkish', name: 'Turkey', flag: '🇹🇷', capital: 'Ankara', region: 'Asie' },
  { area: 'Ukrainian', name: 'Ukraine', flag: '🇺🇦', capital: 'Kyiv', region: 'Europe' },
  { area: 'Uruguayan', name: 'Uruguay', flag: '🇺🇾', capital: 'Montevideo', region: 'Amérique du Sud' },
  { area: 'Vietnamese', name: 'Vietnam', flag: '🇻🇳', capital: 'Hanoï', region: 'Asie' },
];

const WHEEL_COLORS = ['#39005c', '#ff8618', '#ffc928', '#67258a'];
const SPIN_DURATION_MS = 4500;

@Component({
  selector: 'app-roulette',
  imports: [RouterLink],
  templateUrl: './roulette.html',
  styleUrl: './roulette.scss',
})
export class Roulette implements OnDestroy {
  private mealApi = inject(MealApi);

  rotation = 0;

  countries = signal<WheelCountry[]>(VERIFIED_DESTINATIONS);
  selectedCountry = signal<WheelCountry | null>(null);
  centerFlag = signal('🌍');

  meals = signal<any[]>([]);
  loadingMeals = signal(false);
  noMeals = signal(false);
  mealError = signal(false);
  spinning = signal(false);
  wheelCountries = signal<WheelCountry[]>(VERIFIED_DESTINATIONS);

  private flagTimer?: ReturnType<typeof setTimeout>;
  private spinTimer?: ReturnType<typeof setTimeout>;
  private readonly mealsByArea = new Map<string, any[]>();

  get wheelBackground(): string {
    const countries = this.wheelCountries();
    if (countries.length === 0) {
      return WHEEL_COLORS[0];
    }

    const segmentAngle = 360 / countries.length;
    const segments = countries.map((_, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
      return `${color} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }

  ngOnDestroy(): void {
    if (this.flagTimer) {
      clearTimeout(this.flagTimer);
    }
    if (this.spinTimer) {
      clearTimeout(this.spinTimer);
    }
  }

  spinWheel(): void {
    if (this.spinning() || this.countries().length === 0) {
      return;
    }

    this.spinning.set(true);
    this.selectedCountry.set(null);
    this.meals.set([]);
    this.noMeals.set(false);
    this.mealError.set(false);
    this.loadingMeals.set(false);

    const available = this.countries();
    const country = available[Math.floor(Math.random() * available.length)];
    this.centerFlag.set(
      available[Math.floor(Math.random() * available.length)].flag
    );

    const wheelCountries = this.wheelCountries();
    const segmentAngle = 360 / wheelCountries.length;
    const countryIndex = wheelCountries.indexOf(country);
    const targetAngle =
      360 - (countryIndex * segmentAngle + segmentAngle / 2);
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));

    this.rotation += extraSpins + targetAngle;
    const spinStartedAt = Date.now();
    this.animateCenterFlag(available, country, spinStartedAt);
    this.spinTimer = setTimeout(
      () => this.finishSpin(country),
      SPIN_DURATION_MS
    );
  }

  private animateCenterFlag(
    countries: WheelCountry[],
    selected: WheelCountry,
    startedAt: number,
  ): void {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= SPIN_DURATION_MS) {
      return;
    }

    const alternatives = countries.filter((country) => country !== selected);
    const choices = alternatives.length ? alternatives : countries;
    this.centerFlag.set(
      choices[Math.floor(Math.random() * choices.length)].flag
    );

    const progress = elapsed / SPIN_DURATION_MS;
    const nextDelay = 70 + 260 * progress ** 2;
    this.flagTimer = setTimeout(
      () => this.animateCenterFlag(countries, selected, startedAt),
      Math.min(nextDelay, SPIN_DURATION_MS - elapsed)
    );
  }

  private finishSpin(country: WheelCountry): void {
    if (this.flagTimer) {
      clearTimeout(this.flagTimer);
    }

    this.centerFlag.set(country.flag);
    this.selectedCountry.set(country);
    this.spinning.set(false);
    this.loadMeals(country);
  }

  private loadMeals(country: WheelCountry): void {
    const cachedMeals = this.mealsByArea.get(country.area);
    if (cachedMeals) {
      this.meals.set(cachedMeals);
      return;
    }

    this.loadingMeals.set(true);
    this.mealApi.byArea(country.area).subscribe({
      next: (meals) => {
        this.mealsByArea.set(country.area, meals);
        this.meals.set(meals);
        this.noMeals.set(meals.length === 0);
        this.loadingMeals.set(false);
      },
      error: (error) => {
        console.error(`Erreur de chargement des recettes pour ${country.area} :`, error);
        this.mealError.set(true);
        this.loadingMeals.set(false);
      },
    });
  }
}
