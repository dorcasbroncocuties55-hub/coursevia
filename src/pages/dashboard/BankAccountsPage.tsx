import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BankAccountForm } from "@/components/banking/BankAccountForm";
import { ScrollableContent } from "@/components/ui/scrollable-content";

interface BankAccountsPageProps {
  role?: "coach" | "therapist" | "creator";
}

const BankAccountsPage = ({ role }: BankAccountsPageProps) => {
  const { profile } = useAuth();

  const resolvedRole: "coach" | "therapist" | "creator" | "learner" =
    role ?? (profile?.role as any) ?? "learner";

  return (
    <DashboardLayout role={resolvedRole}>
      <ScrollableContent maxHeight="h-full">
        <BankAccountForm role={resolvedRole === "learner" ? "coach" : resolvedRole} />
      </ScrollableContent>
    </DashboardLayout>
  );
};

export default BankAccountsPage;
