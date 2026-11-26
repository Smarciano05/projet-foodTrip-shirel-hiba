import { Component, OnInit, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { MealApi } from '../../../core/services/meal-api';

interface Meal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strArea: string;
  strCategory: string;
  strInstructions: string;
  strYoutube: string;
  [key: string]: any;
}

@Component({
  selector: 'app-details-recipes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './details-recipes.html',
  styleUrl: './details-recipes.scss',
})
export class DetailsRecipe implements OnInit {
  private route = inject(ActivatedRoute);
  private mealApi = inject(MealApi);
  private destroyRef = inject(DestroyRef);

  meal = signal<Meal | null>(null);
  loading = signal(true);
  error = signal(false);

  ingredients = computed(() => {
    const recipe = this.meal();
    if (!recipe) return [];

    return Array.from({ length: 20 }, (_, index) => {
      const number = index + 1;
      return {
        name: recipe[`strIngredient${number}`]?.trim() ?? '',
        measure: recipe[`strMeasure${number}`]?.trim() ?? '',
      };
    }).filter((item) => item.name);
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          this.loading.set(true);
          this.error.set(false);
          this.meal.set(null);

          if (!id) {
            this.loading.set(false);
            this.error.set(true);
            return of([]);
          }


          return this.mealApi.lookup(id).pipe(
            catchError(() => {
              this.error.set(true);
              return of([]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((meals) => {
        this.meal.set(meals[0] ?? null);
        if (!meals.length) this.error.set(true);
      });
  }
}
