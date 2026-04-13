import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Verifications are now handled by Didit - redirect to KYC page
const AdminVerifications = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin/kyc", { replace: true }); }, []);
  return null;
};

export default AdminVerifications;
