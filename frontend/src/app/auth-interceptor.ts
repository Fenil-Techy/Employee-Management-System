import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
const router = inject(Router);
  const token = localStorage.getItem("token");

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError(error => {

      if (error.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
