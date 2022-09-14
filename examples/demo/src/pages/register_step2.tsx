import { useUnipass } from "@/hooks/useUnipass";
import { Button, Form, Input } from "antd";
import { history } from "umi";

const RegisterStep2: React.FC = () => {
  const { verifyCode, unipassWallet } = useUnipass();

  const onFinish = async (values: any) => {
    const res = await verifyCode(values.code);
    if (res) history.push("/register_step3");
  };

  return (
    <div>
      <h3>step2: verify you code</h3>
      <Form name="verify you code" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={onFinish} autoComplete="off">
        <Form.Item label="code" name="code" rules={[{ required: true, message: "Please input your code!" }]}>
          <Input />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit">
            Next
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterStep2;
