import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Subject } from "rxjs";

@Injectable({ providedIn: "root" })
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}
  private graphQLUrl = "http://localhost:3000/graphql";
  private restImageUploadUrl = "http://localhost:3000/upload-profile";

  private authStatusListenner = new Subject<boolean>();
  private userId: string;
  private token: string;
  private isUserLoggedIn: boolean;
  private tokenTimer: NodeJS.Timer;

  getAuthStatusListener() {
    return this.authStatusListenner;
  }

  getBasicSocietyDetailes() {
    const graphqlQuery = {
      query: `{
        getBasicSocietyDetailes{
   	      _id
          name
        }
      }`
    };
    return this.http.post(this.graphQLUrl, graphqlQuery);
  }

  createMember(
    email: string,
    name: string,
    password: string,
    image: File,
    address: string,
    societyId: string,
    phoneNumber: string
  ) {
    const formData = new FormData();
    formData.append("image", image);
    this.http.post(this.restImageUploadUrl, formData).subscribe(
      res => {
        console.log(res);
        const imageUrl = res["imageUrl"];
        const graphqlQuery = {
          query: `
            mutation{
              createMember(memberInput: {email: "${email}", name: "${name}" password: "${password}", 
              imageUrl: "${imageUrl}", address: "${address}", societyId: "${societyId}", phoneNumber: "${phoneNumber}"}){
                _id
                email
                name
            }
          }`
        };
        this.http.post(this.graphQLUrl, graphqlQuery).subscribe(
          res => {
            console.log(res);
            this.router.navigateByUrl("/");
          },
          err => {
            console.log(err);
            this.authStatusListenner.next(false);
          }
        );
      },
      err => {
        console.log(err);
        this.authStatusListenner.next(false);
      }
    );
  }

  createSociety(
    email: string,
    name: string,
    password: string,
    image: File,
    address: string,
    regNo: string,
    phoneNumber: string
  ) {
    const formData = new FormData();
    formData.append("image", image);
    this.http.post(this.restImageUploadUrl, formData).subscribe(
      res => {
        console.log(res);
        const imageUrl = res["imageUrl"];
        const graphqlQuery = {
          query: `
            mutation{
              createSociety(societyInput: {email: "${email}", name: "${name}", password: "${password}", imageUrl: "${imageUrl}", address: "${address}", phoneNumber: "${phoneNumber}", regNo: "2016/008"}){
                _id
              }
            }   
          `
        };
        this.http.post(this.graphQLUrl, graphqlQuery).subscribe(
          res => {
            console.log(res);
            this.router.navigateByUrl("/");
          },
          err => {
            console.log(err);
            this.authStatusListenner.next(false);
          }
        );
      },
      err => {
        console.log(err);
        this.authStatusListenner.next(false);
      }
    );
  }

  loginUser(email: string, password: string, category: string) {
    let graphqlQuery;

    if (category === "member") {
      graphqlQuery = {
        query: `{
        loginMember(email: "${email}", password: "${password}"){
          _id
          token
          expiresIn
        }
      }`
      };
    } else if (category === "society") {
      graphqlQuery = {
        query: `{
        loginSociety(email: "${email}", password: "${password}"){
          _id
          token
          expiresIn
        }
      }`
      };
    } else if (category === "developer") {
      graphqlQuery = {
        query: `{
        loginDeveloper(email: "${email}", password: "${password}"){
          _id
          token
          expiresIn
        }
      }`
      };
    }
    this.http.post(this.graphQLUrl, graphqlQuery).subscribe(
      res => {
        console.log(res);
        let token;

        if (category === "member") {
          token = res["data"].loginMember.token;
        } else if (category === "society") {
          token = res["data"].loginSociety.token;
        } else if (category === "developer") {
          token = res["data"].loginDeveloper.token;
        }

        if (token) {
          let expiresIn;
          let userId;

          if (category === "member") {
            expiresIn = res["data"].loginMember.expiresIn;
            userId = res["data"].loginMember._id;
          } else if (category === "society") {
            expiresIn = res["data"].loginSociety.expiresIn;
            userId = res["data"].loginSociety._id;
          } else if (category === "developer") {
            expiresIn = res["data"].loginDeveloper.expiresIn;
            userId = res["data"].loginDeveloper._id;
          }
          this.token = token;
          this.authStatusListenner.next(true);

          const now = new Date();
          const expirationDate = new Date(now.getTime() + expiresIn * 1000);
          this.isUserLoggedIn = true;
          this.saveAuthData(token, expirationDate, userId);
          this.setAuthTimer(expiresIn);
          if (category === "member") {
            this.router.navigateByUrl("/user/home/" + userId);
          } else if (category === "society") {
            this.router.navigateByUrl("/society/home/" + userId);
          } else if (category === "developer") {
            this.router.navigateByUrl("/developer/home");
          }
        }
      },
      err => {
        console.log(err);
        this.authStatusListenner.next(false);
      }
    );
  }

  private setAuthTimer(expiresIn: number) {
    this.tokenTimer = setTimeout(() => {
      this.logOutUser();
    }, expiresIn * 1000);
  }

  logOutUser() {
    this.token = null;
    this.isUserLoggedIn = false;
    this.authStatusListenner.next(false);
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.userId = null;
    this.router.navigateByUrl("/");
  }

  private saveAuthData(token: string, expirationDate: Date, userId: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("expirationDate", expirationDate.toISOString());
  }

  private clearAuthData() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("expirationDate");
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (authInformation) {
      const now = new Date();
      const expiresIn =
        new Date(authInformation.expirationDate).getTime() - now.getTime();
      if (expiresIn > 0) {
        this.token = authInformation.token;
        this.userId = authInformation.userId;
        this.isUserLoggedIn = true;
        this.setAuthTimer(expiresIn / 1000);
        this.authStatusListenner.next(true);
      }
    }
  }

  private getAuthData() {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const expirationDate = localStorage.getItem("expirationDate");
    if (!token || !expirationDate) {
      return;
    }
    return { token: token, userId: userId, expirationDate: expirationDate };
  }

  isUserAuth() {
    return this.isUserLoggedIn;
  }

  getToken() {
    return this.token;
  }

  getUserId() {
    return this.userId;
  }
}
