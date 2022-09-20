import { useUnipass } from "@/hooks/useUnipass";
import { etherToWei, weiToEther } from "@/utils/format_bignumber";
import MutilTasks from "@/utils/mutil_task";
import { TransactionProps } from "@unipasswallet/provider";
import { Button, Descriptions, Form, Input, message, PageHeader, Select, Spin, Divider, Typography } from "antd";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { history } from "umi";

const { TextArea } = Input;
const { Option } = Select;
const { Paragraph } = Typography;

const LoginStep2: React.FC = () => {
  const [balance, setBalance] = useState("0");
  const [bscbalance, setbscBalance] = useState("0");
  const [rangersbalance, setrangersBalance] = useState("0");
  const [address, setAddress] = useState("");
  const [signedMessage, setSignedMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const { unipassWallet, logout, loading } = useUnipass();

  const queryBaseInfo = async () => {
    if (unipassWallet) {
      try {
        setSendLoading(true);

        const polygonWallet = await unipassWallet.wallet("polygon");
        const bscWallet = await unipassWallet.wallet("bsc");
        const rangersWallet = await unipassWallet.wallet("rangers");

        const balanceMutilTask = new MutilTasks();
        balanceMutilTask.add(polygonWallet?.getAddress());
        balanceMutilTask.add(polygonWallet?.getBalance());
        balanceMutilTask.add(bscWallet?.getBalance());
        balanceMutilTask.add(rangersWallet?.getBalance());
        const [address, balanceRaw1, balanceRaw2, balanceRaw3] = await balanceMutilTask.run();

        setBalance(weiToEther(balanceRaw1));
        setbscBalance(weiToEther(balanceRaw2));
        setrangersBalance(weiToEther(balanceRaw3));
        setAddress(address);
      } catch (e) {
        console.log(e);
      } finally {
        setSendLoading(false);
      }
    }
  };

  useEffect(() => {
    queryBaseInfo();
  }, [unipassWallet]);

  const handleLogout = async () => {
    const res = await logout();
    if (res) history.push("/");
  };

  const sendNativeToken = async (values: any) => {
    if (unipassWallet) {
      try {
        setSendLoading(true);
        const { address, value, feeAddress, feeValue, chain } = values;
        console.log(values);
        const params = {} as TransactionProps;
        params.tx = {
          target: address,
          value: etherToWei(value),
          revertOnError: true,
        };
        if (feeAddress) {
          params.fee = {
            token: feeAddress,
            value: etherToWei(feeValue),
          };
        }
        params.chain = chain;
        await unipassWallet.transaction(params);
        message.success("send native token successfully");
      } catch (e: any) {
        if (e.code === 403001) {
          message.info("Please check your email");
        }
        console.log(e);
      } finally {
        setSendLoading(false);
      }
    }
  };

  const sendErc20Token = async (values: any) => {
    if (unipassWallet) {
      try {
        setSendLoading(true);
        const { address, erc20TokenAddress, erc20TokenValue, feeAddress, feeValue, chain } = values;

        const erc20Interface = new ethers.utils.Interface(["function transfer(address _to, uint256 _value)"]);
        const erc20TokenData = erc20Interface.encodeFunctionData("transfer", [address, etherToWei(erc20TokenValue)]);
        const params = {} as TransactionProps;
        params.tx = {
          target: erc20TokenAddress,
          value: etherToWei("0"),
          revertOnError: true,
          data: erc20TokenData,
        };
        if (values.feeAddress) {
          params.fee = {
            token: feeAddress,
            value: etherToWei(feeValue),
          };
        }
        params.chain = chain;
        console.log(params);
        await unipassWallet.transaction(params);
        message.success("send erc20 token successfully");
      } catch (e: any) {
        if (e.code === 403001) {
          message.info("Please check your email");
        }
        console.log(e);
      } finally {
        setSendLoading(false);
      }
    }
  };

  const signMessage = async (values: any) => {
    if (unipassWallet) {
      setSignLoading(true);
      const signedMsg = await unipassWallet.signMessage(values.message);
      setSignedMessage(signedMsg);
      message.success("sign message successfully");
      setSignLoading(false);
    }
  };

  return (
    <Spin spinning={sendLoading}>
      <h3>login successfully</h3>
      <h4>Address: {address}</h4>
      <Divider />
      <PageHeader ghost={false} title="polygon info">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Balance">{balance}</Descriptions.Item>
        </Descriptions>
      </PageHeader>
      <Divider />

      <PageHeader ghost={false} title="bsc info">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Balance">{bscbalance}</Descriptions.Item>
        </Descriptions>
      </PageHeader>
      <Divider />

      <PageHeader ghost={false} title="rangers info">
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Balance">{rangersbalance}</Descriptions.Item>
        </Descriptions>
      </PageHeader>
      <Divider />

      <h3>sign message</h3>
      <Form name="sign message" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={signMessage} autoComplete="off">
        <Form.Item label="message" name="message" rules={[{ required: true, message: "Please input your message!" }]}>
          <TextArea />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={signLoading} type="primary" htmlType="submit">
            sign message
          </Button>
        </Form.Item>
        <h5>signed message</h5>
        <Paragraph copyable>{signedMessage || "--"}</Paragraph>
      </Form>
      <Divider />

      <h3>send native transaction</h3>
      <Form name="native transaction" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={sendNativeToken} autoComplete="off">
        <Form.Item name="chain" label="chain" rules={[{ required: true }]}>
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
        <Form.Item label="fee token address" name="feeAddress">
          <Input />
        </Form.Item>
        <Form.Item label="fee value" name="feeValue">
          <Input />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={sendLoading} type="primary" htmlType="submit">
            send
          </Button>
        </Form.Item>
      </Form>
      <Divider />

      <h3>send erc20 transaction</h3>
      <Form name="erc20 transaction" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={sendErc20Token} autoComplete="off">
        <Form.Item name="chain" label="chain" rules={[{ required: true }]}>
          <Select placeholder="Select  chain" allowClear>
            <Option value="polygon">polygon</Option>
            <Option value="bsc">bsc</Option>
            <Option value="rangers">rangers</Option>
          </Select>
        </Form.Item>
        <Form.Item label="address" name="address" rules={[{ required: true, message: "Please input your address!" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="erc2 token address" name="erc20TokenAddress" rules={[{ required: true, message: "Please input your address!" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="erc20 token value" name="erc20TokenValue" rules={[{ required: true, message: "Please input your value!" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="fee token address" name="feeAddress">
          <Input />
        </Form.Item>
        <Form.Item label="fee value" name="feeValue">
          <Input />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button loading={sendLoading} type="primary" htmlType="submit">
            send
          </Button>
        </Form.Item>
      </Form>
      <Divider />

      <Button onClick={handleLogout} danger loading={loading}>
        logout
      </Button>
    </Spin>
  );
};

export default LoginStep2;
