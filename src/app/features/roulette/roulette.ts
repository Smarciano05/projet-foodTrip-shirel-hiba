import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Country } from '../../core/services/country';
import { MealApi } from '../../core/services/meal-api';

// Pays -> cuisine TheMealDB
const COUNTRY_TO_AREA: Record<string, string> = {
  'United States': 'American',
  'United Kingdom': 'British',
  Canada: 'Canadian',
  China: 'Chinese',
  Croatia: 'Croatian',
  Netherlands: 'Dutch',
  Egypt: 'Egyptian',
  Philippines: 'Filipino',
  France: 'French',
  Greece: 'Greek',
  India: 'Indian',
  Ireland: 'Irish',
  Italy: 'Italian',
  Jamaica: 'Jamaican',
  Japan: 'Japanese',
  Kenya: 'Kenyan',
  Malaysia: 'Malaysian',
  Mexico: 'Mexican',
  Morocco: 'Moroccan',
  Norway: 'Norwegian',
  Poland: 'Polish',
  Portugal: 'Portuguese',
  Russia: 'Russian',
  Spain: 'Spanish',
  Thailand: 'Thai',
  Tunisia: 'Tunisian',
  Turkey: 'Turkish',
  Ukraine: 'Ukrainian',
  Uruguay: 'Uruguayan',
  Vietnam: 'Vietnamese',
};

@Component({
  selector: 'app-roulette',
  imports: [DecimalPipe],
  templateUrl: './roulette.html',
  styleUrl: './roulette.scss',
})
export class Roulette implements OnInit {
  private countryService = inject(Country);
  private mealApi = inject(MealApi);

  countries = signal<any[]>([]);
  selectedCountry = signal<any>(null);

  meals = signal<any[]>([]);
  loadingMeals = signal(false);
  noMeals = signal(false);

  // Recette ouverte sous un plat
  openMealId = signal<string | null>(null);
  selectedRecipe = signal<any>(null);
  ingredients = signal<{ name: string; measure: string }[]>([]);
  loadingRecipe = signal(false);

  ngOnInit(): void {
    this.countryService.getAllCountries().subscribe({
      next: (data: any) => {
        console.log('Nombre de pays :', data.length);
        this.countries.set(data);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des pays :', error);
      },
    });
  }

  spinRoulette(): void {
    const available = this.countries().filter((c) => COUNTRY_TO_AREA[c.name]);
    if (available.length === 0) return;

    const randomIndex = Math.floor(Math.random() * available.length);
    const country = available[randomIndex];
    this.selectedCountry.set(country);
    console.log('Pays sélectionné :', country);

    // On efface la recette précédente
    this.closeRecipe();

    this.loadMeals(COUNTRY_TO_AREA[country.name]);
  }

  private loadMeals(area: string): void {
    this.meals.set([]);
    this.noMeals.set(false);
    this.loadingMeals.set(true);

    this.mealApi.byArea(area).subscribe({
      next: (meals) => {
        console.log('Plats reçus :', meals);
        this.meals.set(meals);
        this.noMeals.set(meals.length === 0);
        this.loadingMeals.set(false);
      },
      error: (err) => {
        console.error('Erreur MealDB :', err);
        this.noMeals.set(true);
        this.loadingMeals.set(false);
      },
    });
  }

  // Charger la recette d'un plat et l'afficher sous ce plat
  showRecipe(idMeal: string): void {
    this.openMealId.set(idMeal);
    this.loadingRecipe.set(true);
    this.selectedRecipe.set(null);
    this.ingredients.set([]);

    this.mealApi.lookup(idMeal).subscribe({
      next: (result) => {
        const recipe = result[0];
        console.log('Recette reçue :', recipe);

        // TheMealDB donne strIngredient1..20 et strMeasure1..20
        const list: { name: string; measure: string }[] = [];
        for (let i = 1; i <= 20; i++) {
          const name = recipe?.['strIngredient' + i];
          const measure = recipe?.['strMeasure' + i];
          if (name && name.trim() !== '') {
            list.push({ name: name.trim(), measure: (measure ?? '').trim() });
          }
        }

        this.ingredients.set(list);
        this.selectedRecipe.set(recipe ?? null);
        this.loadingRecipe.set(false);
      },
      error: (err) => {
        console.error('Erreur recette :', err);
        this.loadingRecipe.set(false);
      },
    });
  }

  closeRecipe(): void {
    this.openMealId.set(null);
    this.selectedRecipe.set(null);
    this.ingredients.set([]);
    this.loadingRecipe.set(false);
  }
}
