import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface leave_type {
  id: number;
  name: string;
  annual_days: number;
}

export interface LeaveRequests {
  id: number;
  employee_id: number;
  first_name:string,
  last_name:string,
  leave_type_id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  admin_comment:string // 'pending' | 'approved' | 'rejected'
  created_at: string;
}

@Component({
  selector: 'app-leaves',
  imports: [MatIconModule, FormsModule, CommonModule],
  templateUrl: './leaves.html',
  styleUrl: './leaves.css',
})
export class Leaves {
  http = inject(HttpClient);
  leave_types = signal<leave_type[]>([]);
  casualLeaves = computed(() => this.leave_types().find(leave => leave.name === 'Casual Leave')?.annual_days ?? 0);
  sickLeaves = computed(() => this.leave_types().find(leave => leave.name === 'Sick Leave')?.annual_days ?? 0);
  totalAvailableLeaves = computed(() => this.leave_types().reduce((total, leave) => total + Number(leave.annual_days || 0), 0));

  leaveRequests=signal<LeaveRequests[]>([])

  // Expand / Collapse Leaves View State
  showAllLeaves = signal(false);
  visibleLeaves = computed(() => {
    if (this.showAllLeaves() || this.leave_types().length <= 2) {
      return this.leave_types();
    }
    return this.leave_types().slice(0, 5);
  });

  // Edit Leave Quota Modal States
  isEditModalOpen = signal(false);
  editingLeaveType = signal<leave_type | null>(null);
  editDays = signal<number>(0);

  // Add New Leave Type Modal States
  isAddModalOpen = signal(false);
  newLeaveName = signal('');
  newLeaveDays = signal<number | null>(null);

  // Delete Leave Type Modal States
  isDeleteModalOpen = signal(false);
  deletingLeaveType = signal<leave_type | null>(null);

  // Take Action Modal States
  isActionModalOpen = signal(false);
  selectedLeaveRequest = signal<LeaveRequests | null>(null);
  adminComment = signal('');
  isUpdatingStatus = signal(false);

  // Toast Notification States
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  ngOnInit() {
    this.fetchLeaveTypes();
    this.fetchLeaveRequests();
  }

  openAddModal() {
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
    this.newLeaveName.set('');
    this.newLeaveDays.set(null);
  }

  submitAddLeaveType() {
    if (!this.newLeaveName().trim()) {
      this.triggerToast('Please enter a leave type name.', 'error');
      return;
    }
    const payload = {
      name: this.newLeaveName().trim(),
      days: Number(this.newLeaveDays()) || 0
    };

    this.http.post(`http://localhost:3000/leave-types`, payload).subscribe({
      next: () => {
        this.fetchLeaveTypes();
        this.closeAddModal();
        this.triggerToast(`Leave type '${this.newLeaveName()}' created successfully!`, 'success');
      },
      error: (err) => {
        console.error(err);
        this.triggerToast('Failed to create leave type.', 'error');
      }
    });
  }

  toggleShowAllLeaves() {
    this.showAllLeaves.set(!this.showAllLeaves());
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

  fetchLeaveRequests(){
    this.http.get<LeaveRequests[]>("http://localhost:3000/leave-requests").subscribe({
      next:(response)=>{
        this.leaveRequests.set(response)
      },
      error:(error)=>{
        console.log(error)
      }
    })
  }

  openActionModal(request: LeaveRequests) {
    this.selectedLeaveRequest.set(request);
    this.adminComment.set(request.admin_comment || '');
    this.isActionModalOpen.set(true);
  }

  closeActionModal() {
    this.isActionModalOpen.set(false);
    this.selectedLeaveRequest.set(null);
    this.adminComment.set('');
  }

  updateLeaveRequestStatus(status: 'approved' | 'rejected') {
    const request = this.selectedLeaveRequest();
    if (!request) return;

    this.isUpdatingStatus.set(true);
    const payload = {
      status,
      admin_comment: this.adminComment().trim() || null
    };

    this.http.put<{ message: string; leave_request: LeaveRequests }>(
      `http://localhost:3000/leave-requests/${request.id}/status`,
      payload
    ).subscribe({
      next: () => {
        this.isUpdatingStatus.set(false);
        this.closeActionModal();
        this.fetchLeaveRequests();
        const actionWord = status === 'approved' ? 'approved' : 'rejected';
        this.triggerToast(`Leave request #${request.id} has been ${actionWord} successfully!`, status === 'approved' ? 'success' : 'error');
      },
      error: (err) => {
        this.isUpdatingStatus.set(false);
        console.error(err);
        const errorMsg = err.error?.error || `Failed to ${status} leave request.`;
        this.triggerToast(errorMsg, 'error');
      }
    });
  }

  calculateDurationDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

  openEditModal(leave: leave_type) {
    this.editingLeaveType.set(leave);
    this.editDays.set(leave.annual_days);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.editingLeaveType.set(null);
  }

  openDeleteModal(leave: leave_type) {
    this.deletingLeaveType.set(leave);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deletingLeaveType.set(null);
  }

  confirmDeleteLeaveType() {
    const leave = this.deletingLeaveType();
    if (!leave) return;

    this.http.delete<{ message: string }>(`http://localhost:3000/leave-types/${leave.id}`).subscribe({
      next: () => {
        this.fetchLeaveTypes();
        this.closeDeleteModal();
        this.triggerToast(`Leave type '${leave.name}' deleted successfully!`, 'success');
      },
      error: (err) => {
        console.error(err);
        const errorMsg = err.error?.error || 'Failed to delete leave type.';
        this.triggerToast(errorMsg, 'error');
      }
    });
  }

  saveLeaveType() {
    const leave = this.editingLeaveType();
    const days = Number(this.editDays());
    if (!leave) return;

    if (isNaN(days) || days < 0) {
      this.triggerToast('Annual days must be a valid non-negative number.', 'error');
      return;
    }

    this.http.put<{ message: string }>(`http://localhost:3000/leave-types/${leave.id}`, { days }).subscribe({
      next: () => {
        this.fetchLeaveTypes();
        this.closeEditModal();
        this.triggerToast(`Leave allowance for '${leave.name}' updated successfully!`, 'success');
      },
      error: (err) => {
        console.error(err);
        this.triggerToast('Failed to update leave allowance.', 'error');
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
}
