import { Component, computed, inject, signal } from '@angular/core';
import { Auth } from '../../auth';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

interface leave_type {
  id: number;
  name: string;
  annual_days: number;
}

interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Employee_Dashboard {
  http = inject(HttpClient);
  router = inject(Router);
  auth = inject(Auth);

  employeeName = signal('');
  employeeId = signal<number | string>('');
  designation = signal('');
  department = signal('');
  leave_types = signal<leave_type[]>([]);
  leaveRequests = signal<LeaveRequest[]>([]);

  totalLeavesAllowed = computed(() =>
    this.leave_types().reduce((total, leave) => total + Number(leave.annual_days || 0), 0)
  );

  totalApprovedLeave = computed(() =>
    this.leaveRequests()
      .filter((request) => (request.status || '').toLowerCase() === 'approved')
      .reduce((total, approved) => total + this.calculateDurationDays(approved.start_date, approved.end_date), 0)
  );

  totalLeaveBalance = computed(() => this.totalLeavesAllowed() - this.totalApprovedLeave());
  totalAvailableLeaves = computed(() => this.totalLeaveBalance());

  ngOnInit() {
    this.http.get<any>("http://localhost:3000/profile").subscribe({
      next: (response) => {
        if (response?.user) {
          this.employeeName.set(response.user.first_name || '');
          this.employeeId.set(response.user.id || '');
          this.designation.set(response.user.designation || 'Staff Member');
          this.department.set(response.user.department || 'General');
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
    this.fetchLeaveTypes();
    this.fetchLeaveRequests();
  }

  fetchLeaveTypes() {
    this.http.get<leave_type[]>("http://localhost:3000/leave-types").subscribe({
      next: (response) => {
        if (response) {
          this.leave_types.set(response);
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  fetchLeaveRequests() {
    this.http.get<LeaveRequest[]>("http://localhost:3000/my-leave-requests").subscribe({
      next: (response) => {
        if (response) {
          this.leaveRequests.set(response);
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  calculateDurationDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
