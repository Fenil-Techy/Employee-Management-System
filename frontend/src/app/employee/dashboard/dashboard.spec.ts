import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Employee_Dashboard } from './dashboard';

describe('Employee_Dashboard', () => {
  let component: Employee_Dashboard;
  let fixture: ComponentFixture<Employee_Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Employee_Dashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(Employee_Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
