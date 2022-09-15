import { useUnipass } from "@/hooks/useUnipass";
import { Button, Form, Input } from "antd";
import { history } from "umi";

const LoginStep2: React.FC = () => {
  const { logout, loading } = useUnipass();

  const handleLogout = async () => {
    const res = await logout();
    if (res) history.push("/");
  };

  return (
    <div>
      <h3>login successfully</h3>
      <Button onClick={handleLogout} loading={loading}>
        logout
      </Button>
    </div>
  );
};

export default LoginStep2;
