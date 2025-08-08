import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// components
import Sidebar from "./components/Sidebar.jsx";
import SidebarProvider from "./components/SidebarProvider.jsx";
import MobileNav from "./components/MobileNav.jsx";
import OnlinePlayers from "./components/OnlinePlayers.jsx";
import ServerChat from "./components/ServerChat.jsx";
import WaitlistNotice from "./components/WaitlistNotice.jsx";
import Rules from "./components/Rules.jsx";
import Home from "./components/Home.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import FloatingHomeIcon from "./components/FloatingHomeButton.jsx";
import BlueMapViewer from "./components/BlueMap.jsx";
import AdminLoginButton from "./components/AdminLoginButton.jsx";
import Callback from "./components/callbacks/Callback.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { PlayerProvider } from "./components/AdminPlayerProvider.jsx";
import ClickerGame from "./components/clickerGame/ClickerGame.jsx";
import DiscordLoginButton from "./components/DiscordLoginButton.jsx";
import CallbackGame from "./components/callbacks/CallbackGame.jsx";
import CryptoMarket from "./components/CryptoMarket.jsx";
import CallbackCryptoMarket from "./components/callbacks/CallbackCryptoMarket.jsx";
import TokenChartPage from "./components/TokenChartPage.jsx";
import NotFound from "./components/NotFound.jsx";
import Team from "./components/Team.jsx";
import MarketLoginButton from "./components/MarketLoginButton.jsx";
import CallbackMarket from "./components/callbacks/CallbackMarket.jsx";
import Market from "./components/market/Market.jsx";
import CompanyPage from "./components/market/company/CompanyPage.jsx";
import CreateCompanyWizard from "./components/market/company/CreateCompanyWizard.jsx";
import CompanyPreviewPage from "./components/market/company/steps/CompanyPreviewPage.jsx";
import Dashboard from "./components/market/dashboard/Dashboard.jsx";
import Companies from "./components/market/company/Companies.jsx";
import MarketRequests from "./components/market/requests/MarketRequests.jsx";
import MarketShops from "./components/market/shops/MarketShops.jsx";
import PendingCompanyReview from "./components/market/company/PendingCompanyReview.jsx";
import EditCompanyWizard from "./components/market/company/EditCompanyWizard.jsx";
import EditCompanyReview from "./components/market/company/EditCompanyReview.jsx";
import ShopCreateWizard from "./components/market/shops/CreateShopWizard.jsx";
import ShopPreviewPage from "./components/market/shops/ShopPreviewPage.jsx";

function App() {
  return (
    <Router>
      <SidebarProvider>
        <AppWithRouter />
      </SidebarProvider>
    </Router>
  );
}

function AppWithRouter() {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(() => {
    return sessionStorage.getItem("initialLoad") !== "done";
  });

  const shouldShowLoader = showLoader && !location.pathname.includes("/chart/");

  useEffect(() => {
    if (showLoader) {
      sessionStorage.setItem("initialLoad", "done");
    }
  }, [showLoader]);

  return (
    <>
      {shouldShowLoader ? (
        <LoadingScreen onFinish={() => setShowLoader(false)} />
      ) : (
        <div className="app-container">
          {/* Full sidebar for desktops */}
          <Sidebar />

          {/* Bottom nav for mobile */}
          <MobileNav />

          {/* Main content area */}
          <div className="main-content">
            <FloatingHomeIcon />
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/online-players" element={<OnlinePlayers />} />
              <Route path="/server-chat" element={<ServerChat />} />
              <Route path="/apply-to-join" element={<WaitlistNotice />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/blue-map" element={<BlueMapViewer />} />
              <Route path="/login-admin" element={<AdminLoginButton />} />
              <Route path="/discord-login" element={<DiscordLoginButton />} />
              <Route path="/callback" element={<Callback />} />
              <Route path="/game" element={<ClickerGame />} />
              <Route path="/callback-game" element={<CallbackGame />} />
              <Route path="/crypto" element={<CryptoMarket />} />
              <Route
                path="/callback-crypto"
                element={<CallbackCryptoMarket />}
              />
              <Route path="/chart/:symbol" element={<TokenChartPage />} />
              <Route path="/team" element={<Team />} />
              <Route
                path="/admin"
                element={
                  <PlayerProvider>
                    <AdminPanel />
                  </PlayerProvider>
                }
              />
              <Route
                path="/admin/company-review/:companyId"
                element={<PendingCompanyReview />}
              />
              <Route
                path="/admin/company-edit-review/:editId"
                element={<EditCompanyReview />}
              />
              <Route path="/callback-market" element={<CallbackMarket />} />
              <Route path="/market-login" element={<MarketLoginButton />} />
              <Route path="/market" element={<Market />}>
                <Route index element={<Dashboard />} />
                <Route path="companies" element={<Companies />} />
                <Route path="requests" element={<MarketRequests />} />
                <Route path="shops" element={<MarketShops />} />
              </Route>
              <Route
                path="/market/company/:companyId"
                element={<CompanyPage />}
              />
              <Route
                path="/market/create-company"
                element={<CreateCompanyWizard />}
              />
              <Route
                path="/market/create-company/preview"
                element={<CompanyPreviewPage />}
              />
              <Route
                path="/market/company/:companyId/edit"
                element={<EditCompanyWizard />}
              />
              <Route
                path="/market/create-shop"
                element={<ShopCreateWizard />}
              />
              <Route
                path="/market/create-shop/preview"
                element={<ShopPreviewPage />}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
