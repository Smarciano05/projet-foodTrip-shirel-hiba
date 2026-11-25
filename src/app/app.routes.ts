import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Profile } from './features/auth/profile/profile';
import { Roulette } from './features/roulette/roulette';
// @ts-ignore
import { Recipes } from './features/recipes/recipes';
import { DetailsRecipe } from './features/recipes/details-recipes/details-recipes';
import { Map } from './features/map/map';
import { Journal } from './features/journal/journal';
import { authGuard } from './core/auth.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'roulette', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'roulette', component: Roulette },
  { path: 'map', component: Map },
  { path: 'journal', component: Journal, canActivate: [authGuard] },
  { path: 'details-recipes/:id', component: DetailsRecipe },
  { path: '**', redirectTo: 'roulette' },
];
