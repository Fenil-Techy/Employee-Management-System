import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { Auth } from '../auth';

@Component({
  selector: 'app-employee',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],

  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee {
   auth = inject(Auth);
  router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
