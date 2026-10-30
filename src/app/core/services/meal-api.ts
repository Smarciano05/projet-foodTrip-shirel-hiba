import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
//récupérera les recettes.
@Injectable({ providedIn: 'root' })
export class MealApi {
  private http = inject(HttpClient);
  private base = 'https://www.themealdb.com/api/json/v1/1';

  private meals(url: string, params: Record<string, string> = {}): Observable<any[]> {
    return this.http
      .get<{ meals: any[] | null }>(`${this.base}/${url}`, { params })
      .pipe(map((res) => res.meals ?? []));
  }

  random()                 { return this.meals('random.php'); }
  search(name: string)     { return this.meals('search.php', { s: name }); }
  byArea(area: string)     { return this.meals('filter.php', { a: area }); }
  byIngredient(i: string)  { return this.meals('filter.php', { i }); }
  byCategory(c: string)    { return this.meals('filter.php', { c }); }
  lookup(id: string)       { return this.meals('lookup.php', { i: id }); }
}
