import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Admin_Dashboard } from './dashboard';

describe('Admin_Dashboard', () => {
  let component: Admin_Dashboard;
  let fixture: ComponentFixture<Admin_Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin_Dashboard],
    }).compileComponents();
    fixture = TestBed.createComponent(Admin_Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
