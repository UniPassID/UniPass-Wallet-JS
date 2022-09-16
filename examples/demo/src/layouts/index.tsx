import { useUnipass } from "@/hooks/useUnipass";
import { useEffect } from "react";
import { Outlet } from "umi";
import styles from "./index.less";

export default function Layout() {
  const { unipassWallet } = useUnipass();

  useEffect(() => {
    if (unipassWallet) {
      console.log("login status");

      unipassWallet.isLoggedIn().then((res) => {
        console.log(`login status${res}`);
      });
    }
  }, [unipassWallet]);

  return (
    <div className={styles.navs}>
      <Outlet />
    </div>
  );
}
