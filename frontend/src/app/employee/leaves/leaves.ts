import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface LeaveType {
  id: number;
  name: string;
  annual_days: number;
}

export interface LeaveBalanceItem {
  id: number;
  name: string;
  annual_days: number;
  entitled_days: number;
}

export interface LeaveBalanceResponse {
  eligible_days: number;
  total_entitled: number;
  leaves: LeaveBalanceItem[];
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string; // 'pending' | 'approved' | 'rejected'
  created_at: string;
}

@Component({
  selector: 'app-employee-leaves',
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './leaves.html',
  styleUrl: './leaves.css',
})
export class Leaves implements OnInit {
  http = inject(HttpClient);

  // Tab State
  activeTab = signal<'apply' | 'history'>('apply');

  // Form Signals
  leave_types = signal<LeaveType[]>([]);
  leaveTypeId = signal<number | null>(null);
  startDate = signal('');
  endDate = signal('');
  reason = signal('');
  isSubmitting = signal(false);

  // History & Balance Signals
  leaveRequests = signal<LeaveRequest[]>([]);
  leaveBalanceData = signal<LeaveBalanceResponse | null>(null);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  // Computed KPI Balances & Calculations (Entitled - Approved)
  totalLeavesAllowed = computed(() =>
    this.leave_types().reduce((total, leave) => total + Number(leave.annual_days || 0), 0)
  );

  totalEntitledLeaves = computed(() => {
    const data = this.leaveBalanceData();
    if (data && typeof data.total_entitled === 'number') {
      return data.total_entitled;
    }
    return this.totalLeavesAllowed();
  });

  totalAvailableLeaves = computed(() => this.totalEntitledLeaves());

  totalApprovedLeave = computed(() =>
    this.leaveRequests()
      .filter((request) => (request.status || '').toLowerCase() === 'approved')
      .reduce((total, approved) => total + this.calculateDurationDays(approved.start_date, approved.end_date), 0)
  );

  totalLeaveBalance = computed(() =>
    this.totalEntitledLeaves() - this.totalApprovedLeave()
  );

  casualLeaves = computed(() => {
    const leave = this.leave_types().find(l => l.name.toLowerCase().includes('casual'));
    return leave ? leave.annual_days : 0;
  });

  sickLeaves = computed(() => {
    const leave = this.leave_types().find(l => l.name.toLowerCase().includes('sick'));
    return leave ? leave.annual_days : 0;
  });

  calculatedDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = new Date(this.startDate());
    const end = new Date(this.endDate());
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  });

  // History Filtered Computeds (1. Pending, 2. Approved, 3. Rejected)
  pendingRequests = computed(() =>
    this.leaveRequests().filter(r => (r.status || '').toLowerCase() === 'pending')
  );

  approvedRequests = computed(() =>
    this.leaveRequests().filter(r => (r.status || '').toLowerCase() === 'approved')
  );

  rejectedRequests = computed(() =>
    this.leaveRequests().filter(r => (r.status || '').toLowerCase() === 'rejected')
  );

  ngOnInit() {
    this.fetchLeaveTypes();
    this.fetchLeaveRequests();
    this.fetchLeaveBalance();
  }

  fetchLeaveBalance() {
    this.http.get<LeaveBalanceResponse>('http://localhost:3000/leave-balance').subscribe({
      next: (response) => {
        if (response) {
          this.leaveBalanceData.set(response);
        }
      },
      error: (err) => {
        console.error('Failed to fetch leave balance:', err);
      }
    });
  }

  getEntitledDays(leaveId: number): number {
    const balanceItem = this.leaveBalanceData()?.leaves?.find(l => l.id === leaveId);
    if (balanceItem && typeof balanceItem.entitled_days === 'number') {
      return balanceItem.entitled_days;
    }
    const leave = this.leave_types().find(l => l.id === leaveId);
    return leave?.annual_days || 0;
  }

  fetchLeaveTypes() {
    this.http.get<LeaveType[]>('http://localhost:3000/leave-types').subscribe({
      next: (response) => {
        if (response) {
          this.leave_types.set(response);
          if (response.length > 0 && !this.leaveTypeId()) {
            this.leaveTypeId.set(response[0].id);
          }
        }
      },
      error: (err) => {
        console.error('Failed to fetch leave types:', err);
      }
    });
  }

  fetchLeaveRequests() {
    this.http.get<LeaveRequest[]>('http://localhost:3000/my-leave-requests').subscribe({
      next: (response) => {
        if (response) {
          this.leaveRequests.set(response);
        }
      },
      error: (err) => {
        console.error('Failed to fetch leave requests:', err);
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

  resetForm() {
    if (this.leave_types().length > 0) {
      this.leaveTypeId.set(this.leave_types()[0].id);
    } else {
      this.leaveTypeId.set(null);
    }
    this.startDate.set('');
    this.endDate.set('');
    this.reason.set('');
  }

  applyLeave() {
    if (!this.leaveTypeId()) {
      this.triggerToast('Please select a leave category.', 'error');
      return;
    }
    if (!this.startDate() || !this.endDate()) {
      this.triggerToast('Please select both start date and end date.', 'error');
      return;
    }

    const start = new Date(this.startDate());
    const end = new Date(this.endDate());

    if (end < start) {
      this.triggerToast('End date cannot be before start date.', 'error');
      return;
    }

    if (!this.reason().trim()) {
      this.triggerToast('Please provide a reason for your leave request.', 'error');
      return;
    }

    const payload = {
      leave_type_id: this.leaveTypeId(),
      start_date: this.startDate(),
      end_date: this.endDate(),
      reason: this.reason().trim()
    };

    this.isSubmitting.set(true);

    this.http.post<{ message: string }>('http://localhost:3000/leave-requests', payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.triggerToast(response?.message || 'Leave request submitted successfully!', 'success');
        this.resetForm();
        this.fetchLeaveRequests();
        this.fetchLeaveBalance();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('Leave request error:', err);
        const errorMsg = err.error?.error || 'Failed to submit leave request.';
        this.triggerToast(errorMsg, 'error');
      }
    });
  }

  getLeaveIcon(name: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('casual')) return 'beach_access';
    if (lower.includes('sick')) return 'medical_services';
    if (lower.includes('earned') || lower.includes('paid')) return 'payments';
    if (lower.includes('maternity') || lower.includes('paternity')) return 'child_friendly';
    return 'event_available';
  }

  calculateDurationDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
