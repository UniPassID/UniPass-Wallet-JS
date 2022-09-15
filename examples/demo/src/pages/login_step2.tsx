import { useUnipass } from "@/hooks/useUnipass";
import { Button, Form, Input } from "antd";
import { useEffect } from "react";
import { history } from "umi";

const LoginStep2: React.FC = () => {
  const { login, loading } = useUnipass();

  const onFinish = async (values: any) => {
    const res = await login(values.code);
    if (res) history.push("/success");
  };

  return (
    <div>
      <h3>step2: verify you code</h3>
      <Form name="verify you code" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={onFinish} autoComplete="off">
        <Form.Item label="code" name="code" rules={[{ required: true, message: "Please input your code!" }]}>
          <Input />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" loading={loading} htmlType="submit">
            Login
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginStep2;
