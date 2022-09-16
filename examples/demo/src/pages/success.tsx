import { useUnipass } from "@/hooks/useUnipass";
import { etherToWei, weiToEther } from "@/utils/format_bignumber";
import { Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
import { history } from "umi";

const LoginStep2: React.FC = () => {
  const [balance, setBalance] = useState("0");
  const [address, setAddress] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const { unipassWallet, logout, loading } = useUnipass();

  useEffect(() => {
    if (unipassWallet && unipassWallet.wallet) {
      setButtonLoading(true);
      unipassWallet.wallet
        ?.getBalance()
        .then((res) => {
          setBalance(weiToEther(res));
        })
        .finally(() => {
          setButtonLoading(false);
        });
    }
  }, [unipassWallet, unipassWallet?.wallet]);

  useEffect(() => {
    if (unipassWallet && unipassWallet.wallet) {
      setButtonLoading(true);
      unipassWallet.wallet?.getAddress().then((res) => {
        setAddress(res);
      });
    }
  }, [unipassWallet, unipassWallet?.wallet]);

  const handleLogout = async () => {
    const res = await logout();
    if (res) history.push("/");
  };

  const sendMatic = (values: any) => {
    if (unipassWallet) {
      console.log(unipassWallet);

      unipassWallet
        .transaction({
          target: values.address,
          value: etherToWei(values.value),
        })
        .then((res) => {
          console.log(res);
        })
        .catch((e) => {
          console.log(e);
        });
    }
  };

  return (
    <div>
      <h3>login successfully</h3>
      <h4>Address: {address}</h4>
      <h4>Balance: {balance}</h4>
      <Form name="get verify code" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={sendMatic} autoComplete="off">
        <Form.Item label="address" name="address" rules={[{ required: true, message: "Please input your address!" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="value" name="value" rules={[{ required: true, message: "Please input your value!" }]}>
          <Input />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={buttonLoading} type="primary" htmlType="submit">
            {buttonLoading ? "loading balance" : "send"}
          </Button>
        </Form.Item>
      </Form>
      <Button onClick={handleLogout} loading={loading}>
        logout
      </Button>
    </div>
  );
};

export default LoginStep2;
