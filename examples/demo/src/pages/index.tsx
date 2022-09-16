import { useUnipass } from "@/hooks/useUnipass";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { history } from "umi";

export default function HomePage() {
  const [isRegister, setIsRegister] = useState(true);
  const { registerCode, loginCode, passwordToken, loading } = useUnipass();

  const onRe = async (values: any) => {
    const res = await registerCode(values.email);
    if (res) history.push("/register_step2");
  };

  const onLo = async (values: any) => {
    const res = await passwordToken(values.email, values.password);
    if (res) {
      const res1 = await loginCode(values.email);
      if (res1) history.push("/login_step2");
    }
  };

  return (
    <div>
      {isRegister ? (
        <>
          <h3>step1: register</h3>
          <Form name="get verify code" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={onRe} autoComplete="off">
            <Form.Item label="email" name="email" rules={[{ required: true, message: "Please input your email!" }]}>
              <Input />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                Next
              </Button>
            </Form.Item>
          </Form>
        </>
      ) : (
        <>
          <h3>step1: login</h3>
          <Form name="get verify code" labelCol={{ span: 4 }} wrapperCol={{ span: 16 }} onFinish={onLo} autoComplete="off">
            <Form.Item label="email" name="email" rules={[{ required: true, message: "Please input your email!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="password" name="password" rules={[{ required: true, message: "Please input your password!" }]}>
              <Input />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" loading={loading} htmlType="submit">
                Next
              </Button>
            </Form.Item>
          </Form>
        </>
      )}

      <h4
        style={{ cursor: "pointer" }}
        onClick={() => {
          setIsRegister(!isRegister);
        }}
      >
        {isRegister ? "login" : "register"}
      </h4>
    </div>
  );
}
