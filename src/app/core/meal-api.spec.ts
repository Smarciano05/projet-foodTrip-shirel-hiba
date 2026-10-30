import { TestBed } from '@angular/core/testing';
import { MealApi } from './meal-api';

describe('MealApi', () => {
  let service: MealApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MealApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
