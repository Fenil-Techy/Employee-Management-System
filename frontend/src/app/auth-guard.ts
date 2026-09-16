import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth=inject(Auth)
  const requiredRole=route.data["role"]
  if (auth.role==requiredRole){
    return true;
  }
  return false
};
