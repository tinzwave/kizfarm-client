import BuyerBottomNav from "@/components/buyer-bottom-nav";
import BuyerSidebar from "@/components/buyer-sidebar";
import AuthGuard from "@/components/auth-guard";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white pb-20 transition-[padding] duration-300 lg:pb-0 lg:pl-64">
        <BuyerSidebar />
        <div className="min-h-screen">{children}</div>
        <BuyerBottomNav />
      </div>
    </AuthGuard>
  );
}
