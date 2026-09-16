import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '../auth';

interface LoginResponse {
  message: string;
  role: 'employee' | 'admin';
  token: string;
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  http = inject(HttpClient);
  router = inject(Router);
  auth = inject(Auth);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.email, Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  message = signal('');
  status = signal<'success' | 'error' | ''>('');
  hidePassword = signal(true);

  togglePasswordVisibility(): void {
    this.hidePassword.update((val) => !val);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.http.post<LoginResponse>('http://localhost:3000/login', this.loginForm.value).subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.status.set('success');
          localStorage.setItem('token', response.token);
          this.auth.role = response.role;
          if (response.role === 'employee') {
            this.router.navigate(['/employee/dashboard']);
          } else {
            this.router.navigate(['/admin/dashboard']);
          }
        },
        error: (response) => {
          this.message.set(response.error?.error || 'Login failed. Please check your credentials.');
          this.status.set('error');
        }
      });
    }
  }
}

