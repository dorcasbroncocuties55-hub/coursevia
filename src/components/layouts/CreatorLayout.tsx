import { type ReactNode } from "react";
import CreatorSidebar from "./CreatorSidebar";

interface Props { children: ReactNode; }

export default function CreatorLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC" }}>
      <CreatorSidebar />
      <main className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="p-6 lg:p-8 pb-24 lg:pb-8 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
