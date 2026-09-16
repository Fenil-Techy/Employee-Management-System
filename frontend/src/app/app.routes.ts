import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Employee } from './employee/employee';
import { Admin } from './admin/admin';
import { Employee_Dashboard } from './employee/dashboard/dashboard';
import { Profile } from './employee/profile/profile';
import { Leaves as EmployeeLeaves } from './employee/leaves/leaves';
import { Admin_Dashboard } from './admin/dashboard/dashboard';
import { authGuard } from './auth-guard';
import { Employees } from './admin/employees/employees';
import { Designations } from './admin/designations/designations';
import { Departments } from './admin/departments/departments';
import { Leaves } from './admin/leaves/leaves';

export const routes : Routes=[
  {path:"",component:Login,pathMatch:"full"},
  {path:"login",component:Login},

  {path:"employee",component:Employee,canActivate:[authGuard],data:{role:"employee"},children:[
    {path:"",redirectTo:"/employee/dashboard",pathMatch:"full"},
    {path:"dashboard",component:Employee_Dashboard},
    {path:"profile",component:Profile},
    {path:"apply_leave",component:EmployeeLeaves}
  ]},

  {path:"admin",component:Admin,canActivate:[authGuard],data:{role:"admin"},children:[
    {path:"",redirectTo:"/admin/dashboard",pathMatch:"full"},
    {path:"dashboard",component:Admin_Dashboard},
    {path:"employee_management",component:Employees},
    {path:"designations",component:Designations},
    {path:"departments",component:Departments},
    {path:"manage_leaves",component:Leaves}
  ]}

]
