// import Dexie from "dexie";
// import { User } from "../interface";

// const dbName = "UniPassWalletIndexDB";
// const db = new Dexie(dbName);
// db.version(1).stores({ users: "email" });

// interface DBProps {
//   getUsers: () => Promise<User[]>;
//   getUser: (email?: string) => Promise<User | undefined>;
//   setUser: (user: User) => any;
//   delUser: (email: string) => any;
// }

// const DB: DBProps = {
//   async getUsers(): Promise<User[]> {
//     try {
//       const res = await db.table("users").toArray();
//       return res;
//     } catch (err) {
//       return [];
//     }
//   },
//   async getUser(email?: string) {
//     const _email = email || window.localStorage.getItem("email") || "";
//     try {
//       const res = await db.table("users").get(_email);
//       return res;
//     } catch (err) {
//       return undefined;
//     }
//   },
//   async setUser(user: User) {
//     try {
//       window.localStorage.setItem("email", user.email);
//       const res = await db.table("users").put(user);
//       return res;
//     } catch (err) {
//       return undefined;
//     }
//   },
//   async delUser(email: string) {
//     try {
//       window.localStorage.removeItem("email");
//       const res = await db.table("users").delete(email);
//       return res;
//     } catch (err) {
//       return undefined;
//     }
//   },
// };

// export default DB;
