import { useUnipass } from "@/hooks/useUnipass";
import { etherToWei, weiToEther } from "@/utils/format_bignumber";
import { Button, Form, Input, message } from "antd";
import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
import { history } from "umi";

const { TextArea } = Input;

const LoginStep2: React.FC = () => {
  const [balance, setBalance] = useState("0");
  const [address, setAddress] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const { unipassWallet, logout, loading } = useUnipass();

  useEffect(() => {
    if (unipassWallet && unipassWallet.wallet) {
      unipassWallet.wallet?.getBalance().then((res) => {
        setBalance(weiToEther(res));
      });
    }
  }, [unipassWallet, unipassWallet?.wallet]);

  useEffect(() => {
    if (unipassWallet && unipassWallet.wallet) {
      unipassWallet.wallet?.getAddress().then((res) => {
        setAddress(res);
      });
    }
  }, [unipassWallet, unipassWallet?.wallet]);

  const handleLogout = async () => {
    const res = await logout();
    if (res) history.push("/");
  };

  const sendMatic = async (values: any) => {
    if (unipassWallet) {
      setSendLoading(true);
      await unipassWallet.transaction({
        target: values.address,
        value: etherToWei(values.value),
        gasLimit: BigNumber.from("0"),
      });
      message.success("send successfully");
      setSendLoading(false);
    }
  };

  const signMessage = async (values: any) => {
    if (unipassWallet) {
      setSignLoading(true);
      const signedMsg = await unipassWallet.signMessage(values.message, []);
      console.log(signedMsg);

      message.success("sign message successfully");
      setSignLoading(false);
    }
  };

  return (
    <div>
      <h3>login successfully</h3>
      <h4>Address: {address}</h4>
      <h4>Balance: {balance}</h4>
      <Form name="send transaction" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={sendMatic} autoComplete="off">
        <Form.Item label="address" name="address" rules={[{ required: true, message: "Please input your address!" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="value" name="value" rules={[{ required: true, message: "Please input your value!" }]}>
          <Input />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={sendLoading} type="primary" htmlType="submit">
            send
          </Button>
        </Form.Item>
      </Form>

      <Form name="sign message" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={signMessage} autoComplete="off">
        <Form.Item label="message" name="message" rules={[{ required: true, message: "Please input your message!" }]}>
          <TextArea />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={signLoading} type="primary" htmlType="submit">
            sign message
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
