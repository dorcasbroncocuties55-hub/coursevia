import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const VerifyEmail = () => {
  const location = useLocation();
  const email = location.state?.email ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-muted-foreground">
          We sent a confirmation link{email ? ` to ${email}` : ""}. Open your email and click the link to activate your account.
        </p>

        <div className="pt-2">
          <Button asChild className="w-full">
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;