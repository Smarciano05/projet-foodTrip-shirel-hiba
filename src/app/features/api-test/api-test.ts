import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MealApi } from '../../core/meal-api';

@Component({
  selector: 'app-api-test',
  imports: [JsonPipe],
  templateUrl: './api-test.html',
})
export class ApiTest {
  private api = inject(MealApi);
  result = signal<any>(null);

  private show(nom: string) {
    return {
      next: (res: any) => {
        console.log(`✅ ${nom}`, res);
        this.result.set(res);
      },
      error: (err: any) => console.error(`❌ ${nom}`, err),
    };
  }

  testRandom()  { this.api.random().subscribe(this.show('random')); }
  testSearch()  { this.api.search('Arrabiata').subscribe(this.show('search')); }
  testArea()    { this.api.byArea('Japanese').subscribe(this.show('area')); }
  testEmpty()   { this.api.search('zzzzzz').subscribe(this.show('recherche vide')); }
  testLookup()  { this.api.lookup('52772').subscribe(this.show('lookup')); }
}
