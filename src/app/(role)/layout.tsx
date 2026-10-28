import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-transparent flex flex-col flex-grow">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-10 pb-6 flex flex-col flex-grow">
        <Header />
        <Breadcrumbs />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}