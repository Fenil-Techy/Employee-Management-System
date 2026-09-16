import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface Department {
  id: number;
  name: string;
  employees_count?: number | string;
}

@Component({
  selector: 'app-departments',
  imports: [MatIconModule, FormsModule],
  templateUrl: './departments.html',
  styleUrl: './departments.css',
})
export class Departments {
  http = inject(HttpClient);
  departments = signal<Department[]>([]);

  // Add / Edit Modal States
  isModalOpen = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  departmentName = signal('');

  // Delete Warning Modal States
  isDeleteModalOpen = signal(false);
  departmentToDelete = signal<Department | null>(null);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  ngOnInit() {
    this.fetchDepartments();
  }

  fetchDepartments() {
    this.http.get<Department[]>("http://localhost:3000/departments").subscribe({
      next: (response) => {
        this.departments.set(response);
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
    this.departmentName.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(dept: Department) {
    this.isEditMode.set(true);
    this.editingId.set(dept.id);
    this.departmentName.set(dept.name);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  openDeleteWarningModal(dept: Department) {
    this.departmentToDelete.set(dept);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.departmentToDelete.set(null);
  }

  saveDepartment() {
    const name = this.departmentName().trim();
    if (!name) {
      this.triggerToast('Department name is required.', 'error');
      return;
    }

    if (this.isEditMode() && this.editingId()) {
      this.http.put<{ message: string; department: Department }>(
        `http://localhost:3000/departments/${this.editingId()}`,
        { name }
      ).subscribe({
        next: () => {
          this.fetchDepartments();
          this.closeModal();
          this.triggerToast('Department updated successfully!', 'success');
        },
        error: (err) => {
          const errMsg = err.error?.error || 'Failed to update department.';
          this.triggerToast(errMsg, 'error');
        }
      });
    } else {
      this.http.post<{ message: string; department: Department }>(
        "http://localhost:3000/departments",
        { name }
      ).subscribe({
        next: () => {
          this.fetchDepartments();
          this.closeModal();
          this.triggerToast('Department created successfully!', 'success');
        },
        error: (err) => {
          const errMsg = err.error?.error || 'Failed to create department.';
          this.triggerToast(errMsg, 'error');
        }
      });
    }
  }

  confirmDeleteDepartment() {
    const dept = this.departmentToDelete();
    if (!dept) return;

    this.http.delete<{ message: string }>(`http://localhost:3000/departments/${dept.id}`).subscribe({
      next: () => {
        this.fetchDepartments();
        this.closeDeleteModal();
        this.triggerToast(`Department '${dept.name}' deleted successfully.`, 'success');
      },
      error: (err) => {
        this.closeDeleteModal();
        const errMsg = err.error?.error || `Department '${dept.name}' cannot be deleted because employees are assigned to it.`;
        this.triggerToast(errMsg, 'error');
      }
    });
  }
}
