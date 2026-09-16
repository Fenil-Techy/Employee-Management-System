import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Auth } from '../../auth';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Admin_Dashboard {
  http = inject(HttpClient);
  auth = inject(Auth);
  router = inject(Router);
  adminName = signal("");
  total_employees = signal(0);
  total_designations = signal(0);
  total_departments = signal(0);

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;

  barChart: Chart | null = null;
  pieChart: Chart | null = null;

  activeBarTab = signal<'department' | 'designation'>('department');

  private deptList: { name: string; count: number }[] = [];
  private desList: { name: string; count: number }[] = [];
  private roleCounts: { [key: string]: number } = {};

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.http.get<any>("http://localhost:3000/profile").subscribe({
      next: (response) => {
        this.adminName.set(response.user.name);
      },
      error: (error) => console.log(error)
    });

    this.http.get<any[]>("http://localhost:3000/employees").subscribe({
      next: (response) => {
        this.total_employees.set(response.length);
        
        // Calculate role distribution
        const roles: { [key: string]: number } = {};
        response.forEach(emp => {
          const r = emp.role ? (emp.role.charAt(0).toUpperCase() + emp.role.slice(1)) : 'Unknown';
          roles[r] = (roles[r] || 0) + 1;
        });
        this.roleCounts = roles;

        setTimeout(() => this.initPieChart(), 50);
      },
      error: (error) => console.log(error)
    });
    
    this.http.get<any[]>("http://localhost:3000/designations").subscribe({
      next: (response) => {
        this.total_designations.set(response.length);
        this.desList = response.map(d => ({ name: d.name, count: Number(d.employees_count || 0) }));
        setTimeout(() => this.initBarChart(), 50);
      },
      error: (error) => console.log(error)
    });

    this.http.get<any[]>("http://localhost:3000/departments").subscribe({
      next: (response) => {
        this.total_departments.set(response.length);
        this.deptList = response.map(d => ({ name: d.name, count: Number(d.employees_count || 0) }));
        setTimeout(() => this.initBarChart(), 50);
      },
      error: (error) => console.log(error)
    });
  }

  switchBarTab(tab: 'department' | 'designation') {
    this.activeBarTab.set(tab);
    this.initBarChart();
  }

  initBarChart() {
    if (!this.barCanvas?.nativeElement) return;
    if (this.barChart) {
      this.barChart.destroy();
    }

    const isDept = this.activeBarTab() === 'department';
    const datasetList = isDept ? this.deptList : this.desList;
    const labels = datasetList.map(item => item.name);
    const data = datasetList.map(item => item.count);

    const ctx = this.barCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    if (isDept) {
      gradient.addColorStop(0, 'rgba(108, 92, 231, 0.85)');
      gradient.addColorStop(1, 'rgba(108, 92, 231, 0.15)');
    } else {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.85)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
    }

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          label: isDept ? 'Employees per Department' : 'Employees per Designation',
          data: data.length > 0 ? data : [0],
          backgroundColor: gradient,
          borderColor: isDept ? '#6c5ce7' : '#3b82f6',
          borderWidth: 2,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 45
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 10,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: 'bold' }, color: '#64748b' }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  initPieChart() {
    if (!this.pieCanvas?.nativeElement) return;
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    const labels = Object.keys(this.roleCounts);
    const data = Object.values(this.roleCounts);

    const ctx = this.pieCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: [
            '#6c5ce7',
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ec4899'
          ],
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { size: 12, weight: 'bold' },
              color: '#334155'
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 10
          }
        }
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
