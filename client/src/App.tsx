import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import PartnersPage from "@/pages/partners";
import ItemsPage from "@/pages/items";
import BarcodesPage from "@/pages/barcodes";
import PurchasePage from "@/pages/purchase";
import SalesPage from "@/pages/sales";
import InventoryPage from "@/pages/inventory";
import VouchersPage from "@/pages/accounting/vouchers";
import AccountsPage from "@/pages/accounting/accounts";
import PaymentsPage from "@/pages/accounting/payments";
import StatementsPage from "@/pages/accounting/statements";
import TaxInvoicesPage from "@/pages/accounting/tax-invoices";
import UsersPage from "@/pages/settings/users";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/partners" component={PartnersPage} />
      <ProtectedRoute path="/items" component={ItemsPage} />
      <ProtectedRoute path="/barcodes" component={BarcodesPage} />
      <ProtectedRoute path="/purchase" component={PurchasePage} />
      <ProtectedRoute path="/sales" component={SalesPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/accounting/vouchers" component={VouchersPage} />
      <ProtectedRoute path="/accounting/accounts" component={AccountsPage} />
      <ProtectedRoute path="/accounting/payments" component={PaymentsPage} />
      <ProtectedRoute path="/accounting/statements" component={StatementsPage} />
      <ProtectedRoute path="/accounting/tax-invoices" component={TaxInvoicesPage} />
      <ProtectedRoute path="/settings/users" component={UsersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
