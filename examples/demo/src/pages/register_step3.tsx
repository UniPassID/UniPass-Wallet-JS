import { useUnipass } from "@/hooks/useUnipass";
import { Button, Form, Input } from "antd";
import { history } from "umi";

const RegisterStep3: React.FC = () => {
  const { register } = useUnipass();

  const onFinish = async (values: any) => {
    const res = await register(values.password);
    if (res) history.push("/success");
  };

  return (
    <div>
      <h3>step3: verify you password</h3>
      <Form name="verify you password" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={onFinish} autoComplete="off">
        <Form.Item label="password" name="password" rules={[{ required: true, message: "Please input your password!" }]}>
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

export default RegisterStep3;
