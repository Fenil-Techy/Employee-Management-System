import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from "@angular/router";
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../auth';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  auth = inject(Auth);
  router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
