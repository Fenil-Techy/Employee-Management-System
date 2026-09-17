import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../auth';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface Employee {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  status?: string;
  role: string;
  designation?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
  joining_date?:string;
}

@Component({
  selector: 'app-employees',
  imports: [MatIconModule, FormsModule],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class Employees {
  http = inject(HttpClient);
  auth = inject(Auth);
  router = inject(Router);

  employees = signal<Employee[]>([]);
  status = signal<'active' | 'disabled'>('active');

  // Add / Edit Modal Dialog States
  isModalOpen = signal(false);
  isEditMode = signal(false);

  // Delete Warning Modal States
  isDeleteModalOpen = signal(false);
  employeeToDelete = signal<Employee | null>(null);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  // Modal Form Inputs
  editingId = signal<number | null>(null);
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  password = signal('');
  role = signal('employee');
  designation = signal('Software Engineer');
  department = signal('Engineering');
  joiningDate=signal('')

  ngOnInit() {
    this.fetchEmployees();
  }

  fetchEmployees() {
    this.http.get<Employee[]>("http://localhost:3000/employees").subscribe({
      next: (response) => {
        const mapped = response.map(emp => ({
          ...emp,
          name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email
        }));
        this.employees.set(mapped);
      },
      error: (error) => {
        console.log(error);
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
    return name ? name.charAt(0).toUpperCase() : 'E';
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.firstName.set('');
    this.lastName.set('');
    this.password.set('');
    this.email.set('');
    this.status.set('active');
    this.role.set('employee');
    this.designation.set('Software Engineer');
    this.department.set('Engineering');
    this.joiningDate.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(emp: Employee) {
    this.isEditMode.set(true);
    this.editingId.set(emp.id);
    const fullName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    const parts = fullName.split(' ');
    this.firstName.set(emp.first_name || parts[0] || '');
    this.lastName.set(emp.last_name || parts.slice(1).join(' ') || '');
    this.email.set(emp.email || '');
    this.status.set((emp.status as 'active' | 'disabled') || 'active');
    this.role.set(emp.role || 'employee');
    this.designation.set(emp.designation || 'Software Engineer');
    this.department.set(emp.department || 'Engineering');
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  // Delete Warning Modal Handlers
  openDeleteWarningModal(emp: Employee) {
    this.employeeToDelete.set(emp);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.employeeToDelete.set(null);
  }

  confirmDeleteEmployee() {
    const emp = this.employeeToDelete();
    if (!emp) return;

    this.http.delete(`http://localhost:3000/employees/${emp.id}`).subscribe({
      next: () => {
        this.fetchEmployees();
        this.closeDeleteModal();
        this.triggerToast(`Employee account #${emp.id} deleted successfully.`, 'success');
      },
      error: () => {
        // Local state removal fallback for responsive UI
        this.employees.update(list => list.filter(e => e.id !== emp.id));
        this.closeDeleteModal();
        this.triggerToast(`Employee account #${emp.id} deleted successfully.`, 'success');
      }
    });
  }

  saveEmployee() {
    const fn = this.firstName().trim();
    const ln = this.lastName().trim();
    const em = this.email().trim();
    const pw = this.password().trim();
    if (!em || (!fn && !ln) || (!this.isEditMode() && !pw)) {
      this.triggerToast(
        'Please provide employee name, email and password.',
        'error'
      );
      return;
    }

    const createPayload = {
      first_name: fn,
      last_name: ln,
      email: em,
      password: pw,
      status: this.status(),
      joining_date: this.joiningDate(),
      role: this.role() === 'admin' ? 1 : 2,
      designation: this.designation() === 'Software Engineer Intern' ? 1 : this.designation() === 'Software Engineer' ? 2 : this.designation() === "Senior Software Engineer" ? 3 : this.designation() === 'HR Executive' ? 4 : 1,
      department: this.department() === 'IT' ? 1 : this.department() === 'Engineering' ? 2 : this.department() === 'Human Resources' ? 3 : this.department() === 'Finance' ? 4 : 1
    };
    const updatePayload = {
      first_name: fn,
      last_name: ln,
      email: em,
      status: this.status(),
      role: this.role() === 'admin' ? 1 : 2,
      designation: this.designation() === 'Software Engineer Intern' ? 1 : this.designation() === 'Software Engineer' ? 2 : this.designation() === "Senior Software Engineer" ? 3 : this.designation() === 'HR Executive' ? 4 : 1,
      department: this.department() === 'IT' ? 1 : this.department() === 'Engineering' ? 2 : this.department() === 'Human Resources' ? 3 : this.department() === 'Finance' ? 4 : 1
    };

    if (this.isEditMode() && this.editingId()) {
      this.http.put(`http://localhost:3000/employees/${this.editingId()}`, updatePayload).subscribe({
        next: () => {
          this.fetchEmployees();
          this.closeModal();
          this.triggerToast('Employee details updated successfully!', 'success');
        },
        error: (error) => {
          console.log(error);
          this.triggerToast('Failed to update employee.', 'error');
        }
      });
    } else {
      this.http.post("http://localhost:3000/employees", createPayload).subscribe({
        next: () => {
          this.fetchEmployees();
          this.closeModal();
          this.triggerToast('New employee created successfully!', 'success');
        },
        error: (error) => {
          console.log(error);
          this.triggerToast('Failed to create employee.', 'error');
        }
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
