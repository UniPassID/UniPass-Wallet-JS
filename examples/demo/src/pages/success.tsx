import { useUnipass } from "@/hooks/useUnipass";
import { etherToWei, weiToEther } from "@/utils/format_bignumber";
import { Button, Form, Input, message, Select, Spin } from "antd";
import { BigNumber } from "ethers";
import { useEffect, useState } from "react";
import { history } from "umi";

const { TextArea } = Input;
const { Option } = Select;

const LoginStep2: React.FC = () => {
  const [balance, setBalance] = useState("0");
  const [bscbalance, setbscBalance] = useState("0");
  const [rangersbalance, setrangersBalance] = useState("0");
  const [address, setAddress] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const { unipassWallet, logout, loading } = useUnipass();

  const queryBaseInfo = async () => {
    if (unipassWallet) {
      setSendLoading(true);
      const polygonWallet = await unipassWallet.wallet("polygon");
      const bscWallet = await unipassWallet.wallet("bsc");
      const rangersWallet = await unipassWallet.wallet("rangers");
      console.log(polygonWallet);

      const balanceRaw1 = await polygonWallet?.getBalance();
      const balanceRaw2 = await bscWallet?.getBalance();
      const balanceRaw3 = await rangersWallet?.getBalance();

      const address = await polygonWallet?.getAddress();
      setBalance(weiToEther(balanceRaw1));
      setbscBalance(weiToEther(balanceRaw2));
      setrangersBalance(weiToEther(balanceRaw3));
      setAddress(address);
      setSendLoading(false);
    }
  };

  useEffect(() => {
    queryBaseInfo();
  }, [unipassWallet]);

  const handleLogout = async () => {
    const res = await logout();
    if (res) history.push("/");
  };

  const sendMatic = async (values: any) => {
    if (unipassWallet) {
      try {
        setSendLoading(true);
        await unipassWallet.transaction(
          {
            target: values.address,
            value: etherToWei(values.value),
            gasLimit: BigNumber.from("0"),
            revertOnError: true,
          },
          undefined,
          values.Chain,
        );
        message.success("send successfully");
      } catch (e) {
        console.log(e);
      } finally {
        setSendLoading(false);
      }
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

  const syncEmail = async () => {
    if (unipassWallet) {
      await unipassWallet.sendSyncEmail();

      message.success("sendSyncEmail successfully");
    }
  };

  return (
    <Spin spinning={sendLoading}>
      <h3>login successfully</h3>
      <h4>Address: {address}</h4>
      <h4>polygon Balance: {balance}</h4>
      <h4>bsc Balance: {bscbalance}</h4>
      <h4>rangers Balance: {rangersbalance}</h4>

      <Form name="send transaction" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={sendMatic} autoComplete="off">
        <Form.Item name="Chain" label="Chain" rules={[{ required: true }]}>
          <Select placeholder="Select  chain" allowClear>
            <Option value="polygon">polygon</Option>
            <Option value="bsc">bsc</Option>
            <Option value="rangers">rangers</Option>
          </Select>
        </Form.Item>
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
      <Button onClick={syncEmail} loading={loading}>
        sync email
      </Button>
      <Button onClick={handleLogout} loading={loading}>
        logout
      </Button>
    </Spin>
  );
};

export default LoginStep2;
