import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface Designation {
  id: number;
  name: string;
  employees_count?: number | string;
}

@Component({
  selector: 'app-designations',
  imports: [MatIconModule, FormsModule],
  templateUrl: './designations.html',
  styleUrl: './designations.css',
})
export class Designations {
  http = inject(HttpClient);
  designations = signal<Designation[]>([]);

  // Add / Edit Modal States
  isModalOpen = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  designationName = signal('');

  // Delete Warning Modal States
  isDeleteModalOpen = signal(false);
  designationToDelete = signal<Designation | null>(null);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  ngOnInit() {
    this.fetchDesignations();
  }

  fetchDesignations() {
    this.http.get<Designation[]>("http://localhost:3000/designations").subscribe({
      next: (response) => {
        this.designations.set(response);
      },
      error: (error) => {
        console.error(error);
      }
    });
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

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : 'D';
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.designationName.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(des: Designation) {
    this.isEditMode.set(true);
    this.editingId.set(des.id);
    this.designationName.set(des.name);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  openDeleteWarningModal(des: Designation) {
    this.designationToDelete.set(des);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.designationToDelete.set(null);
  }

  saveDesignation() {
    const name = this.designationName().trim();
    if (!name) {
      this.triggerToast('Designation name is required.', 'error');
      return;
    }

    if (this.isEditMode() && this.editingId()) {
      this.http.put<{ message: string; designation: Designation }>(
        `http://localhost:3000/designations/${this.editingId()}`,
        { name }
      ).subscribe({
        next: () => {
          this.fetchDesignations();
          this.closeModal();
          this.triggerToast('Designation updated successfully!', 'success');
        },
        error: (err) => {
          const errMsg = err.error?.error || 'Failed to update designation.';
          this.triggerToast(errMsg, 'error');
        }
      });
    } else {
      this.http.post<{ message: string; designation: Designation }>(
        "http://localhost:3000/designations",
        { name }
      ).subscribe({
        next: () => {
          this.fetchDesignations();
          this.closeModal();
          this.triggerToast('Designation created successfully!', 'success');
        },
        error: (err) => {
          const errMsg = err.error?.error || 'Failed to create designation.';
          this.triggerToast(errMsg, 'error');
        }
      });
    }
  }

  confirmDeleteDesignation() {
    const des = this.designationToDelete();
    if (!des) return;

    this.http.delete<{ message: string }>(`http://localhost:3000/designations/${des.id}`).subscribe({
      next: () => {
        this.fetchDesignations();
        this.closeDeleteModal();
        this.triggerToast(`Designation '${des.name}' deleted successfully.`, 'success');
      },
      error: (err) => {
        this.closeDeleteModal();
        const errMsg = err.error?.error || `Designation '${des.name}' cannot be deleted because employees are assigned to it.`;
        this.triggerToast(errMsg, 'error');
      }
    });
  }
}
