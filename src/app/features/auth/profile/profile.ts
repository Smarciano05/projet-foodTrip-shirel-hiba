import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../../core/auth';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  loading = signal(true);
  message = signal('');
  error = signal('');

  ngOnInit() {
    this.auth.getProfile().subscribe({
      next: (user) => {
        this.form.patchValue({ name: user.name, email: user.email });
        this.loading.set(false);
      },
      error: () => this.auth.logout(),
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.message.set('');
    this.error.set('');

    this.auth.updateProfile(this.form.getRawValue()).subscribe({
      next: () => this.message.set('Profil mis à jour.'),
      error: (err) => this.error.set(err.error?.message ?? 'Mise à jour impossible.'),
    });
  }

  logout() {
    this.auth.logout();
  }
}
