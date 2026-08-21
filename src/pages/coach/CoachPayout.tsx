// Redirects to the new withdrawals page with Stripe Connect integration
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TherapistPayout() {
  const nav = useNavigate();
  useEffect(() => { nav("/therapist/withdrawals", { replace: true }); }, [nav]);
  return null;
}
