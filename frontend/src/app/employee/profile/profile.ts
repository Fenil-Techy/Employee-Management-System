import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface EmployeeProfileData {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  designation?: string;
  department?: string;
  status?: string;
}

@Component({
  selector: 'app-employee-profile',
  imports: [MatIconModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  http = inject(HttpClient);

  profile = signal<EmployeeProfileData | null>(null);

  // Edit Profile Modal States
  isEditModalOpen = signal(false);
  firstName = signal('');
  lastName = signal('');
  email = signal('');

  // Password Reset Modal States
  isPasswordModalOpen = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  currentPasswordError = signal(false);
  newPasswordError = signal(false);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  ngOnInit() {
    this.fetchProfile();
  }

  fetchProfile() {
    this.http.get<any>('http://localhost:3000/profile').subscribe({
      next: (response) => {
        if (response?.user) {
          const user = response.user;
          this.profile.set(user);
          const fullName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
          const parts = fullName.split(' ');
          this.firstName.set(user.first_name || parts[0] || '');
          this.lastName.set(user.last_name || parts.slice(1).join(' ') || '');
          this.email.set(user.email || '');
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  getInitial(name?: string): string {
    return name ? name.charAt(0).toUpperCase() : 'E';
  }

  triggerToast(message: string, type: 'success' | 'error' = 'success') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);
    this.toastTimeout = setTimeout(() => {
      this.showToast.set(false);
    }, 4000);
  }

  openEditModal() {
    const prof = this.profile();
    if (prof) {
      const fullName = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
      const parts = fullName.split(' ');
      this.firstName.set(prof.first_name || parts[0] || '');
      this.lastName.set(prof.last_name || parts.slice(1).join(' ') || '');
      this.email.set(prof.email || '');
    }
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  // Password Reset Modal Handlers
  openResetPasswordModal() {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.currentPasswordError.set(false);
    this.newPasswordError.set(false);
    this.isPasswordModalOpen.set(true);
  }

  closeResetPasswordModal() {
    this.isPasswordModalOpen.set(false);
  }

  submitPasswordReset() {
    const cur = this.currentPassword().trim();
    const newPw = this.newPassword().trim();

    if (!cur || !newPw) {
      this.triggerToast('Please fill in both current password and new password fields.', 'error');
      return;
    }

    if (newPw.length < 8) {
      this.newPasswordError.set(true);
      return;
    }
    this.newPasswordError.set(false);

    const payload = {
      oldPassword: cur,
      newPassword: newPw
    };
    
    if (this.isPasswordModalOpen()) {
      this.http.put<{ message?: string }>("http://localhost:3000/password-reset", payload).subscribe({
        next: (response) => {
          console.log("SUCCESS:", response);
          this.currentPasswordError.set(false);
          this.newPasswordError.set(false);
          this.closeResetPasswordModal();
          this.triggerToast("Password reset successfully", "success");
        },
        error: (err) => {
          console.error("ERROR:", err);
          this.currentPasswordError.set(true);
        }
      });
    }
  }

  // Static Save Profile handler (user will add logic)
  saveProfile() {
    const fn = this.firstName().trim();
    const ln = this.lastName().trim();
    const em = this.email().trim();

    if (!em || (!fn && !ln)) {
      this.triggerToast('Please provide your name and email address.', 'error');
      return;
    }

    const payload = {
      first_name: fn,
      last_name: ln,
      email: em
    }

    this.http.put("http://localhost:3000/edit-profile", payload).subscribe({
      next: (response) => {
        console.log("SUCCESS:", response);
        this.closeEditModal();
        this.triggerToast("Profile updated successfully", "success");
        this.fetchProfile()
      },
      error: (err) => {
        console.error("ERROR:", err);
        this.triggerToast("Profile update failed", "error");
      }
    })

  }
}
