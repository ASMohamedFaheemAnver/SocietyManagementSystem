import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { Subject } from "rxjs";
import { Member } from "../member.model";
import { Log } from "../log.model";
import { Society } from "../society.model";
import { Apollo, gql } from "apollo-angular";

@Injectable({ providedIn: "root" })
export class SocietyService {
  private societyStatusListenner = new Subject<boolean>();
  private membersUpdated = new Subject<Member[]>();
  private logsUpdated = new Subject<{ logs: Log[]; logs_count: number }>();
  private members: Member[] = [];
  private logs: Log[] = [];
  private logs_count: number;
  private offlineLog: Log;
  private backeEndBaseUrl = environment.backeEndBaseUrl2;
  private society: Society;
  private newLog: Log;
  private societyUpdated = new Subject<Society>();

  constructor(private apollo: Apollo) {}

  getSociety() {
    const graphqlQuery = gql`
      query {
        getSociety {
          _id
          name
          email
          imageUrl
          regNo
          address
          expected_income
          current_income
          number_of_members
          month_fee {
            amount
            description
          }
        }
      }
    `;

    this.apollo
      .query({ query: graphqlQuery, fetchPolicy: "network-only" })
      .subscribe(
        (res) => {
          this.society = {
            ...res["data"]["getSociety"],
            isImageLoading: true,
            imageUrl: this.backeEndBaseUrl + res["data"]["getSociety"].imageUrl,
          };
          this.societyStatusListenner.next(false);
          this.societyUpdated.next({ ...this.society, isImageLoading: true });
        },
        (err) => {
          console.log(err);
          this.societyStatusListenner.next(false);
        }
      );
  }

  getAllMembers() {
    const graphqlQuery = gql`
      query {
        getAllMembers {
          _id
          name
          email
          imageUrl
          address
          arrears
          approved
        }
      }
    `;

    this.apollo
      .query({ query: graphqlQuery, fetchPolicy: "network-only" })
      .subscribe(
        (res) => {
          console.log({ emitted: "getAllMembers", data: res });
          this.members = res["data"]["getAllMembers"].map((member) => {
            return {
              ...member,
              imageUrl: this.backeEndBaseUrl + member.imageUrl,
              isImageLoading: true,
            };
          });
          this.membersUpdated.next([...this.members]);
          this.societyStatusListenner.next(false);
        },
        (err) => {
          console.log(err);
          this.societyStatusListenner.next(false);
        }
      );
  }

  getMembersUpdateListenner() {
    return this.membersUpdated;
  }

  getSocietyUpdatedListenner() {
    return this.societyUpdated;
  }

  getSocietyStatusListenner() {
    return this.societyStatusListenner;
  }

  getSocietyLogListenner() {
    return this.logsUpdated;
  }

  approveMember(memberId: string) {
    const graphqlQuery = gql`
      mutation{
        approveMember(memberId: "${memberId}"){
          message
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        let updatedMembers = this.members;
        updatedMembers = updatedMembers.map((member) => {
          if (member._id === memberId) {
            member.approved = true;
            member.isActionLoading = false;
          }
          return member;
        });
        this.members = updatedMembers;
        this.membersUpdated.next([...updatedMembers]);
        this.societyStatusListenner.next(false);
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }
  disApproveMember(memberId: string) {
    const graphqlQuery = gql`
      mutation{
        disApproveMember(memberId: "${memberId}"){
          message
        }
      }
    `;
    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        let updatedMembers = this.members;
        updatedMembers = updatedMembers.map((member) => {
          if (member._id === memberId) {
            member.approved = false;
            member.isActionLoading = false;
          }
          return member;
        });
        this.members = updatedMembers;
        this.membersUpdated.next([...updatedMembers]);
        this.societyStatusListenner.next(false);
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  addMonthlyFeeToEveryone(monthlyFee, description) {
    const graphqlQuery = gql`
      mutation{
        addMonthlyFeeToEveryone(monthlyFee: ${monthlyFee}, description: "${description}"){
          _id
          kind
          fee{
            _id
            amount
            date
            description
            tracks{
                  _id
                  member{
                    _id
                    imageUrl
                    name
                  }
                  is_paid
                }
          }
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.newLog = res["data"]["addMonthlyFeeToEveryone"];
        this.logs.unshift(this.newLog);
        this.logsUpdated.next({
          logs: this.logs,
          logs_count: ++this.logs_count,
        });
        this.society.expected_income +=
          monthlyFee * this.society.number_of_members;
        this.societyUpdated.next({ ...this.society, isImageLoading: false });
        this.societyStatusListenner.next(false);
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  addExtraFeeToEveryone(extraFee, description) {
    const graphqlQuery = gql`
      mutation{
        addExtraFeeToEveryone(extraFee: ${extraFee}, description: "${description}"){
          _id
          kind
          fee{
            _id
            amount
            date
            description
            tracks{
                _id
                member{
                _id
                imageUrl
                name
                }
                is_paid
              }
          }
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.newLog = res["data"]["addExtraFeeToEveryone"];
        this.logs.unshift(this.newLog);
        this.logsUpdated.next({
          logs: this.logs,
          logs_count: ++this.logs_count,
        });
        this.society.expected_income +=
          extraFee * this.society.number_of_members;
        this.societyUpdated.next({ ...this.society, isImageLoading: false });
        this.societyStatusListenner.next(false);
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  getSocietyLogs(page_number, page_size) {
    const graphqlQuery = gql`
      query{
        getSocietyLogs(page_number: ${page_number}, page_size: ${page_size}){
          logs{
              _id
              kind
              fee{
                _id
                date
                amount
                description
                tracks{
                  _id
                  member{
                    _id
                    imageUrl
                    name
                  }
                  is_paid
                }
              }
            }
          logs_count
          }
      }
    `;

    this.apollo
      .query({ query: graphqlQuery, fetchPolicy: "network-only" })
      .subscribe(
        (res) => {
          this.logs = res["data"]["getSocietyLogs"].logs.map((log) => {
            return {
              ...log,
              fee: {
                ...log.fee,
                tracks: [
                  ...log.fee.tracks.map((track) => {
                    return { ...track, member: { ...track.member } };
                  }),
                ],
              },
            };
          });

          this.logs_count = res["data"]["getSocietyLogs"].logs_count;
          this.logsUpdated.next({
            logs: [...this.logs],
            logs_count: this.logs_count,
          });
          this.societyStatusListenner.next(false);
        },
        (err) => {
          console.log(err);
          this.societyStatusListenner.next(false);
        }
      );
  }

  getOneSocietyOfflineLog(log_id: string) {
    if (this.logs.length === 0) {
      return;
    }

    this.offlineLog = this.logs.find((log) => {
      return log._id === log_id;
    });

    return this.offlineLog;
  }

  makeFeePaidForOneMember(track_id: string, log_id: string) {
    console.log({ emitted: "makeFeePaidForOneMember" });
    if (!track_id) {
      return;
    }

    const graphqlQuery = gql`
      mutation{
        makeFeePaidForOneMember(track_id: "${track_id}", log_id: "${log_id}"){
          message
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.logs.map((log) => {
          return {
            ...log,
            fee: {
              ...log.fee,
              tracks: log.fee.tracks.map((track) => {
                if (track._id === track_id) {
                  track.is_paid = true;
                }
                return track;
              }),
            },
          };
        });

        this.society.current_income += this.logs.find((log) => {
          return log._id === log_id;
        }).fee.amount;

        this.societyUpdated.next({ ...this.society, isImageLoading: false });

        this.logsUpdated.next({
          logs: [...this.logs],
          logs_count: this.logs_count,
        });
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  makeFeeUnPaidForOneMember(track_id: string, log_id: string) {
    console.log({ emitted: "makeFeeUnPaidForOneMember" });

    if (!track_id) {
      return;
    }

    const graphqlQuery = gql`
      mutation{
        makeFeeUnPaidForOneMember(track_id: "${track_id}", log_id: "${log_id}"){
          message
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.logs.map((log) => {
          return {
            ...log,
            fee: {
              ...log.fee,
              tracks: log.fee.tracks.map((track) => {
                if (track._id === track_id) {
                  track.is_paid = false;
                }
                return track;
              }),
            },
          };
        });

        this.society.current_income -= this.logs.find((log) => {
          return log._id === log_id;
        }).fee.amount;

        this.societyUpdated.next({ ...this.society, isImageLoading: false });

        this.logsUpdated.next({
          logs: [...this.logs],
          logs_count: this.logs_count,
        });
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  editFeeForEveryone(log_id: string, fee: number, description: string) {
    if (!log_id) {
      return;
    }

    const graphqlQuery = gql`
      mutation{
        editFeeForEveryone(log_id: "${log_id}", fee: ${fee}, description: "${description}"){
           _id
          kind
          fee{
            _id
            amount
            date
            description
            tracks{
                _id
                member{
                _id
                imageUrl
                name
                }
                is_paid
              }
          }
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.logs = this.logs.map((log) => {
          if (log._id === res["data"]["editFeeForEveryone"]._id) {
            for (
              let i = 0;
              i < res["data"]["editFeeForEveryone"].fee.tracks.length;
              i++
            ) {
              let track = res["data"]["editFeeForEveryone"].fee.tracks[i];

              if (track.is_paid) {
                this.society.expected_income +=
                  res["data"]["editFeeForEveryone"].fee.amount;
                this.society.expected_income -= log.fee.amount;
                this.society.current_income -= log.fee.amount;
              } else {
                this.society.expected_income +=
                  res["data"]["editFeeForEveryone"].fee.amount;
                this.society.expected_income -= log.fee.amount;
              }
            }

            this.societyUpdated.next({
              ...this.society,
              isImageLoading: false,
            });

            return res["data"]["editFeeForEveryone"];
          }
          return log;
        });

        this.logsUpdated.next({
          logs: [...this.logs],
          logs_count: this.logs_count,
        });
        this.societyStatusListenner.next(false);
      },
      (err) => {
        console.log(err);
        this.societyStatusListenner.next(false);
      }
    );
  }

  deleteFeeLog(log: Log) {
    console.log({ emitted: "deleteFeeLog" });

    const graphqlQuery = gql`
      mutation {
        deleteFeeLog(log_id: "${log._id}"){
          message
        }
      }
    `;

    this.apollo.mutate({ mutation: graphqlQuery }).subscribe(
      (res) => {
        this.societyStatusListenner.next(false);
        this.logs = this.logs.filter((tLog) => {
          if (tLog._id !== log._id) {
            return true;
          }
          return false;
        });

        log.fee.tracks.forEach((track) => {
          if (track.is_paid) {
            this.society.current_income -= log.fee.amount;
          }
          this.society.expected_income -= log.fee.amount;
        });

        this.societyUpdated.next({ ...this.society, isImageLoading: false });

        this.logsUpdated.next({
          logs: this.logs,
          logs_count: --this.logs_count,
        });
      },
      (err) => {
        this.societyStatusListenner.next(false);
        console.log(err);
      }
    );
  }
}
