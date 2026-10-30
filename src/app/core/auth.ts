import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthResponse, User } from './models/user';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/register', { name, email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/login', { email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout(): void {
    this.http.post('/api/logout', {}).pipe(catchError(() => of(null))).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>('/api/profile').pipe(tap((u) => this.setUser(u)));
  }

  updateProfile(data: { name: string; email: string }): Observable<User> {
    return this.http.put<User>('/api/profile', data).pipe(tap((u) => this.setUser(u)));
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.setUser(res.user);
  }

  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
