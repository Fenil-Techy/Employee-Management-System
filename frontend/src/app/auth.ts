import { HttpClient } from '@angular/common/http';
import { inject, Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',

})
export class Auth {
  role:"employee"|"admin"|null=null
  name:string|null=null
  id:number|null=null

  constructor(){
    this.restoreSession()
  }

  restoreSession(){
    const token=localStorage.getItem("token")
    if (!token){
      return
    }
     try {

      const payload = JSON.parse(atob(token.split('.')[1]));

      this.role = payload.role;
      this.name = payload.name;
      this.id = payload.id;

    } catch (error) {

      console.log("Invalid token");
      this.logout();

    }

  }

  logout(){
    localStorage.removeItem("token");
    this.role = null;
    this.name = null;
    this.id = null;
  }

}
