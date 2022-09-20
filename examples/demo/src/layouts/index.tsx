import { useUnipass } from "@/hooks/useUnipass";
import { useEffect, useState } from "react";
import { Outlet } from "umi";
import styles from "./index.less";
import { history } from "umi";
import { Spin } from "antd";

export default function Layout() {
  const [pageLoading, setPageLoading] = useState(true);
  const { unipassWallet } = useUnipass();

  useEffect(() => {
    if (unipassWallet) {
      setPageLoading(true);
      unipassWallet
        .isLoggedIn()
        .then((loggedIn) => {
          if (loggedIn) {
            history.push("/success");
          } else {
            history.replace("/");
          }
        })
        .finally(() => {
          setPageLoading(false);
        });
    }
  }, [unipassWallet]);

  return <div className={styles.navs}>{pageLoading ? <Spin spinning /> : <Outlet />}</div>;
}
