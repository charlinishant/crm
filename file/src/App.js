import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ADDLEAD from"./pages/Addlead"
// import HomePageOne from "./pages/HomePageOne";
import HomePageTwo from "./pages/HomePageTwo";
import HomePageThree from "./pages/HomePageThree";
import HomePageFour from "./pages/HomePageFour";
import HomePageFive from "./pages/HomePageFive";
import HomePageSix from "./pages/HomePageSix";
import HomePageSeven from "./pages/HomePageSeven";
import EmailPage from "./pages/EmailPage";
import AddUserPage from "./pages/AddUserPage";
import AlertPage from "./pages/AlertPage";
import AssignRolePage from "./pages/AssignRolePage";
import AvatarPage from "./pages/AvatarPage";
import BadgesPage from "./pages/BadgesPage";
import ButtonPage from "./pages/ButtonPage";
import CalendarMainPage from "./pages/CalendarMainPage";
import CardPage from "./pages/CardPage";
import CarouselPage from "./pages/CarouselPage";
import ChatEmptyPage from "./pages/ChatEmptyPage";
import ChatMessagePage from "./pages/ChatMessagePage";
import ChatProfilePage from "./pages/ChatProfilePage";
import CodeGeneratorNewPage from "./pages/CodeGeneratorNewPage";
import CodeGeneratorPage from "./pages/CodeGeneratorPage";
import ColorsPage from "./pages/BrokerageinvoicesPage";
import ColumnChartPage from "./pages/ColumnChartPage";
import CompanyPage from "./pages/CompanyPage";
import CurrenciesPage from "./pages/CurrenciesPage";
import DropdownPage from "./pages/DropdownPage";
import ErrorPage from "./pages/ErrorPage";
import FaqPage from "./pages/FaqPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import FormLayoutPage from "./pages/FormLayoutPage";
import SmsPage from "./pages/SmsPage";
import FormPage from "./pages/CallsPage";
import GalleryPage from "./pages/GalleryPage";
import ImageGeneratorPage from "./pages/ImageGeneratorPage";
import ImageUploadPage from "./pages/ImageUploadPage";
import InvoiceAddPage from "./pages/InvoiceAddPage";
import InvoiceEditPage from "./pages/InvoiceEditPage";
import InvoiceListPage from "./pages/InvoiceListPage";
import InvoicePreviewPage from "./pages/InvoicePreviewPage";
import KanbanPage from "./pages/KanbanPage";
import LanguagePage from "./pages/LanguagePage";
import LineChartPage from "./pages/LineChartPage";
import ListPage from "./pages/ListPage";
import MarketplaceDetailsPage from "./pages/MarketplaceDetailsPage";
import MarketplacePage from "./pages/MarketplacePage";
import NotificationAlertPage from "./pages/NotificationAlertPage";
import NotificationPage from "./pages/NotificationPage";
import PaginationPage from "./pages/PaginationPage";
import PaymentGatewayPage from "./pages/PaymentGatewayPage";
import PieChartPage from "./pages/PieChartPage";
import PortfolioPage from "./pages/PortfolioPage";
import PricingPage from "./pages/PricingPage";
import ProgressPage from "./pages/ProgressPage";
import RadioPage from "./pages/RadioPage";
import RoleAccessPage from "./pages/RoleAccessPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import StarRatingPage from "./pages/StarRatingPage";
import StarredPage from "./pages/StarredPage";
import SwitchPage from "./pages/SwitchPage";
import TableBasicPage from "./pages/TableBasicPage";
import TableDataPage from "./pages/TableDataPage";
import TabsPage from "./pages/TabsPage";
import TagsPage from "./pages/TagsPage";
import TermsConditionPage from "./pages/TermsConditionPage";
import TextGeneratorPage from "./pages/TextGeneratorPage";
import ThemePage from "./pages/ThemePage";
import TooltipPage from "./pages/TooltipPage";
import TypographyPage from "./pages/BookingPage";
import UsersGridPage from "./pages/UsersGridPage";
import UsersListPage from "./pages/UsersListPage";
import ViewDetailsPage from "./pages/ViewDetailsPage";
import VideoGeneratorPage from "./pages/VideoGeneratorPage";
import VideosPage from "./pages/VideosPage";
import ViewProfilePage from "./pages/ViewProfilePage";
import VoiceGeneratorPage from "./pages/VoiceGeneratorPage";
import WalletPage from "./pages/WalletPage";
import WidgetsPage from "./pages/WidgetsPage";
import SiteVistsPage from "./pages/SiteVistsPage";
import NewEnquiriesPage from "./pages/NewEnquiriesPage";
import CallLaterPage from "./pages/CallLaterPage";
import MissedCallPage from "./pages/MissedCallPage";
import ReassignedToMePage from "./pages/ReassignedToMePage";
import UnreadEmailPage from "./pages/UnreadEmailPage";
import MissedFollowupsPage from "./pages/MissedFollowupsPage";
import UntouchedLeadsAttemptsPage1 from "./pages/UntouchedLeadsAttemptsPage1";
import UntouchedLeadsAttemptsPage2 from "./pages/UntouchedLeadsAttemptsPage2";
import UntouchedLeadsAttemptsPage3 from "./pages/UntouchedLeadsAttemptsPage3";
import FollowupsPage from "./pages/FollowupsPage";
import WhatAppPage from "./pages/WhatAppPage";
import BlukClickPage from "./pages/BlukClickPage";
import RouteScrollToTop from "./helper/RouteScrollToTop";
import TextGeneratorNewPage from "./pages/TextGeneratorNewPage";
import HomePageEight from "./pages/HomePageEight";
import HomePageNine from "./pages/HomePageNine";
import HomePageTen from "./pages/HomePageTen";
import HomePageEleven from "./pages/HomePageEleven";
import GalleryGridPage from "./pages/GalleryGridPage";
import GalleryMasonryPage from "./pages/GalleryMasonryPage";
import GalleryHoverPage from "./pages/GalleryHoverPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailsPage from "./pages/BlogDetailsPage";
import AddBlogPage from "./pages/AddBlogPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import MaintenancePage from "./pages/MaintenancePage";
import BlankPagePage from "./pages/BlankPagePage";
import NEWPROJECT from "./pages/Newproject";
import Preview from "./pages/preview";
import Details from "./pages/Details";
import Alltask from "./pages/Alltask";
import OpenTask from "./pages/opentask";
import CompletedTask from "./pages/completedtask";
import Archivedtask from "./pages/Archivedtask";
import Projecttower from "./components/child/Projecttower";
import Newtower from "./components/Newtower";
import Floorplans from "./pages/Floorplans";
import AddFloorplan from "./pages/addfloorplan";
import Units from "./pages/Units";
import AddUnits from "./pages/addunits";
import SalesUserPanel from "./user/SalesUserPanel";
import UserPreview from "./user/userPreview";

const publicPaths = new Set(["/", "/sign-in", "/sign-up", "/forgot-password"]);

const ProtectedAppRoutes = () => {
  const location = useLocation();
  const token = localStorage.getItem("authToken");

  if (!token && !publicPaths.has(location.pathname)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
      <Routes>
         <Route exact path='/' element={<SignInPage />} />
        <Route exact path='/add-lead' element={<ADDLEAD />} />
        <Route exact path='/preview' element={<Preview />} />
        <Route exact path='/user-preview' element={<UserPreview />} />
        <Route exact path='/details' element={<Details />} />
        <Route exact path='/index-11' element={<HomePageEleven />} />
        <Route exact path='/user/sales' element={<SalesUserPanel />} />
        <Route exact path='/user/sales/leads' element={<SalesUserPanel />} />
        <Route exact path='/index-2' element={<HomePageTwo />} />
         <Route exact path='/index-3' element={<HomePageThree />} />
         <Route exact path='/index-4' element={<HomePageFour />} />
        <Route exact path='/index-5' element={<HomePageFive />} />
        <Route exact path='/index-6' element={<HomePageSix />} />
        <Route exact path='/index-7' element={<HomePageSeven />} />
        <Route exact path='/column-chart' element={<ColumnChartPage />} />
        <Route exact path='/new-project' element={<NEWPROJECT />} />
        <Route exact path='/add-user' element={<AddUserPage />} />
        <Route exact path='/alert' element={<AlertPage />} />
        <Route exact path='/assign-role' element={<AssignRolePage />} />
        <Route exact path='/avatar' element={<AvatarPage />} />
        <Route exact path='/badges' element={<BadgesPage />} />
        <Route exact path='/button' element={<ButtonPage />} />
        <Route exact path='/calendar-main' element={<CalendarMainPage />} />
        <Route exact path='/calendar' element={<CalendarMainPage />} />
        <Route exact path='/card' element={<CardPage />} />
        <Route exact path='/carousel' element={<CarouselPage />} />
        <Route exact path='/chat-empty' element={<ChatEmptyPage />} />
        <Route exact path='/chat-message' element={<ChatMessagePage />} />
        <Route exact path='/chat-profile' element={<ChatProfilePage />} />
        <Route exact path='/code-generator' element={<CodeGeneratorPage />} />
        <Route exact path='/code-generator-new' element={<CodeGeneratorNewPage />} />
        <Route exact path='/colors' element={<ColorsPage />} />
        <Route exact path='/company' element={<CompanyPage />} />
        <Route exact path='/currencies' element={<CurrenciesPage />} />
        <Route exact path='/dropdown' element={<DropdownPage />} />
        <Route exact path='/email' element={<EmailPage />} />
        <Route exact path='/faq' element={<FaqPage />} />
        <Route exact path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route exact path='/form-layout' element={<FormLayoutPage />} />
        <Route exact path='/SmsPage' element={<SmsPage />} />
        <Route exact path='/form' element={<FormPage />} />
        <Route exact path='/gallery' element={<GalleryPage />} />
        <Route exact path='/gallery-grid' element={<GalleryGridPage />} />
        <Route exact path='/gallery-masonry' element={<GalleryMasonryPage />} />
        <Route exact path='/gallery-hover' element={<GalleryHoverPage />} />
        <Route exact path='/blog' element={<BlogPage />} />
        <Route exact path='/blog-details' element={<BlogDetailsPage />} />
        <Route exact path='/add-blog' element={<AddBlogPage />} />
        <Route exact path='/testimonials' element={<TestimonialsPage />} />
        <Route exact path='/coming-soon' element={<ComingSoonPage />} />
        <Route exact path='/access-denied' element={<AccessDeniedPage />} />
        <Route exact path='/maintenance' element={<MaintenancePage />} />
        <Route exact path='/blank-page' element={<BlankPagePage />} />
        <Route exact path='/image-generator' element={<ImageGeneratorPage />} />
        <Route exact path='/image-upload' element={<ImageUploadPage />} />
        <Route exact path='/invoice-add' element={<InvoiceAddPage />} />
        <Route exact path='/invoice-edit' element={<InvoiceEditPage />} />
        <Route exact path='/invoice-list' element={<InvoiceListPage />} />
        <Route exact path='/invoice-preview' element={<InvoicePreviewPage />} />
        <Route exact path='/kanban' element={<KanbanPage />} />
        <Route exact path='/language' element={<LanguagePage />} />
        <Route exact path='/line-chart' element={<LineChartPage />} />
        <Route exact path='/list' element={<ListPage />} />
        <Route exact path='/marketplace-details' element={<MarketplaceDetailsPage />} />
        <Route exact path='/marketplace' element={<MarketplacePage />} />
        <Route exact path='/notification-alert' element={<NotificationAlertPage />} />
         <Route exact path='/add-units' element={<AddUnits />} />
        <Route exact path='/units' element={<Units />} />
        <Route exact path='/floorplans' element={<Floorplans />} />
        <Route exact path='/addfloorplan' element={<AddFloorplan />} />
        <Route exact path='/new-tower' element={<Newtower />} />
        <Route exact path='/project-towers' element={<Projecttower />} />
        <Route exact path='/notification' element={<NotificationPage />} />
        <Route exact path='/pagination' element={<PaginationPage />} />
        <Route exact path='/payment-gateway' element={<PaymentGatewayPage />} />
        <Route exact path='/pie-chart' element={<PieChartPage />} />
        <Route exact path='/portfolio' element={<PortfolioPage />} />
        <Route exact path='/pricing' element={<PricingPage />} />
        <Route exact path='/progress' element={<ProgressPage />} />
        <Route exact path='/radio' element={<RadioPage />} />
        <Route exact path='/role-access' element={<RoleAccessPage />} />
        <Route exact path='/sign-in' element={<SignInPage />} />
        <Route exact path='/sign-up' element={<SignUpPage />} />
        <Route exact path='/star-rating' element={<StarRatingPage />} />
        <Route exact path='/starred' element={<StarredPage />} />
        <Route exact path='/switch' element={<SwitchPage />} />
        <Route exact path='/table-basic' element={<TableBasicPage />} />
        <Route exact path='/table-data' element={<TableDataPage />} />
        <Route exact path='/open-tasks' element={<OpenTask />} />
        <Route exact path='/completed-tasks' element={<CompletedTask />} />
        <Route exact path='/archived-tasks' element={<Archivedtask />} />
        <Route exact path='/all-tasks' element={<Alltask />} />
        <Route exact path='/tabs' element={<TabsPage />} />
        <Route exact path='/tags' element={<TagsPage />} />
        <Route exact path='/terms-condition' element={<TermsConditionPage />} />
        <Route exact path='/text-generator-new' element={<TextGeneratorNewPage />} />
        <Route exact path='/text-generator' element={<TextGeneratorPage />} />
        <Route exact path='/theme' element={<ThemePage />} />
        <Route exact path='/tooltip' element={<TooltipPage />} />
        <Route exact path='/typography' element={<TypographyPage />} />
        <Route exact path='/users-grid' element={<UsersGridPage />} />
        <Route exact path='/all-users' element={<UsersListPage />} />
        <Route exact path='/view-details' element={<ViewDetailsPage />} />
        <Route exact path='/video-generator' element={<VideoGeneratorPage />} />
        <Route exact path='/videos' element={<VideosPage />} />
        <Route exact path='/view-profile' element={<ViewProfilePage />} />
        <Route exact path='/voice-generator' element={<VoiceGeneratorPage />} />
        <Route exact path='/wallet' element={<WalletPage />} />
        <Route exact path='/widgets' element={<WidgetsPage />} />
        <Route exact path='/NewEnquiries' element={< NewEnquiriesPage />} />
        <Route exact path='/CallLater' element={< CallLaterPage />} />
        <Route exact path='/MissedCall' element={< MissedCallPage/>} />
        <Route exact path='/ReassignedToMe' element={< ReassignedToMePage/>} />
        <Route exact path='/UnreadEmailS' element={< UnreadEmailPage/>} />
        <Route exact path='/MissedFollowups' element={< MissedFollowupsPage/>} />
        <Route exact path='/UntouchedLeadsAttempts1' element={<UntouchedLeadsAttemptsPage1/>} />
        <Route exact path='/UntouchedLeadsAttempts2' element={<UntouchedLeadsAttemptsPage2/>} />
        <Route exact path='/UntouchedLeadsAttempts3' element={<UntouchedLeadsAttemptsPage3/>} />
        <Route exact path='/Followups' element={< FollowupsPage />} />
        <Route exact path='/SiteVists' element={< SiteVistsPage/>} />
         <Route exact path='/WhatApp' element={< WhatAppPage />} />
         <Route exact path='/BlukClickToCalls' element={< BlukClickPage />} />
        <Route exact path='*' element={<ErrorPage />} />
      </Routes>
  );
};



function App() {
  return (
    <BrowserRouter>
      <RouteScrollToTop />
      <ProtectedAppRoutes />
      {false && <Routes>
         <Route exact path='/' element={<SignInPage />} />
        <Route exact path='/add-lead' element={<ADDLEAD />} />
        <Route exact path='/preview' element={<Preview />} />
        <Route exact path='/user-preview' element={<UserPreview />} />
        <Route exact path='/details' element={<Details />} />
        <Route exact path='/index-11' element={<HomePageEleven />} />
        <Route exact path='/user/sales' element={<SalesUserPanel />} />
        <Route exact path='/user/sales/leads' element={<SalesUserPanel />} />
        <Route exact path='/index-2' element={<HomePageTwo />} />
         <Route exact path='/index-3' element={<HomePageThree />} />
         <Route exact path='/index-4' element={<HomePageFour />} />
        <Route exact path='/index-5' element={<HomePageFive />} />
        <Route exact path='/index-6' element={<HomePageSix />} />
        <Route exact path='/index-7' element={<HomePageSeven />} />
        <Route exact path='/column-chart' element={<ColumnChartPage />} />
        <Route exact path='/new-project' element={<NEWPROJECT />} />
        {/*
       
        
       
        
     
        <Route exact path='/index-8' element={<HomePageEight />} />
        <Route exact path='/index-9' element={<HomePageNine />} />
        <Route exact path='/index-10' element={<HomePageTen />} />
        */}
       


       {/* SL */}
        {/* <Route exact path='login' element={<Login />} /> */}
        <Route exact path='/add-user' element={<AddUserPage />} />
        <Route exact path='/alert' element={<AlertPage />} />
        <Route exact path='/assign-role' element={<AssignRolePage />} />
        <Route exact path='/avatar' element={<AvatarPage />} />
        <Route exact path='/badges' element={<BadgesPage />} />
        <Route exact path='/button' element={<ButtonPage />} />
        <Route exact path='/calendar-main' element={<CalendarMainPage />} />
        <Route exact path='/calendar' element={<CalendarMainPage />} />
        <Route exact path='/card' element={<CardPage />} />
        <Route exact path='/carousel' element={<CarouselPage />} />
        <Route exact path='/chat-empty' element={<ChatEmptyPage />} />
        <Route exact path='/chat-message' element={<ChatMessagePage />} />
        <Route exact path='/chat-profile' element={<ChatProfilePage />} />
        <Route exact path='/code-generator' element={<CodeGeneratorPage />} />
        <Route
          exact
          path='/code-generator-new'
          element={<CodeGeneratorNewPage />}
        />
        <Route exact path='/colors' element={<ColorsPage />} />
        
        <Route exact path='/company' element={<CompanyPage />} />
        <Route exact path='/currencies' element={<CurrenciesPage />} />
        <Route exact path='/dropdown' element={<DropdownPage />} />
        <Route exact path='/email' element={<EmailPage />} />
        <Route exact path='/faq' element={<FaqPage />} />
        <Route exact path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route exact path='/form-layout' element={<FormLayoutPage />} />
        <Route exact path='/SmsPage' element={<SmsPage />} />
        <Route exact path='/form' element={<FormPage />} />

        <Route exact path='/gallery' element={<GalleryPage />} />
        <Route exact path='/gallery-grid' element={<GalleryGridPage />} />
        <Route exact path='/gallery-masonry' element={<GalleryMasonryPage />} />
        <Route exact path='/gallery-hover' element={<GalleryHoverPage />} />

        <Route exact path='/blog' element={<BlogPage />} />
        <Route exact path='/blog-details' element={<BlogDetailsPage />} />
        <Route exact path='/add-blog' element={<AddBlogPage />} />

        <Route exact path='/testimonials' element={<TestimonialsPage />} />
        <Route exact path='/coming-soon' element={<ComingSoonPage />} />
        <Route exact path='/access-denied' element={<AccessDeniedPage />} />
        <Route exact path='/maintenance' element={<MaintenancePage />} />
        <Route exact path='/blank-page' element={<BlankPagePage />} />

        <Route exact path='/image-generator' element={<ImageGeneratorPage />} />
        <Route exact path='/image-upload' element={<ImageUploadPage />} />
        <Route exact path='/invoice-add' element={<InvoiceAddPage />} />
        <Route exact path='/invoice-edit' element={<InvoiceEditPage />} />
        <Route exact path='/invoice-list' element={<InvoiceListPage />} />
        <Route exact path='/invoice-preview' element={<InvoicePreviewPage />} />
        <Route exact path='/kanban' element={<KanbanPage />} />
        <Route exact path='/language' element={<LanguagePage />} />
        <Route exact path='/line-chart' element={<LineChartPage />} />
        <Route exact path='/list' element={<ListPage />} />
      
        <Route
          exact
          path='/marketplace-details'
          element={<MarketplaceDetailsPage />}
        />
        <Route exact path='/marketplace' element={<MarketplacePage />} />
        <Route
          exact
          path='/notification-alert'
          element={<NotificationAlertPage />}
        
        />
         <Route exact path='/add-units' element={<AddUnits />} />
        <Route exact path='/units' element={<Units />} />
        <Route exact path='/floorplans' element={<Floorplans />} />
        <Route exact path='/addfloorplan' element={<AddFloorplan />} />
        <Route exact path='/new-tower' element={<Newtower />} />
        <Route exact path='/project-towers' element={<Projecttower />} />
        <Route exact path='/notification' element={<NotificationPage />} />
        <Route exact path='/pagination' element={<PaginationPage />} />
        <Route exact path='/payment-gateway' element={<PaymentGatewayPage />} />
        <Route exact path='/pie-chart' element={<PieChartPage />} />
        <Route exact path='/portfolio' element={<PortfolioPage />} />
        <Route exact path='/pricing' element={<PricingPage />} />
        <Route exact path='/progress' element={<ProgressPage />} />
        <Route exact path='/radio' element={<RadioPage />} />
        <Route exact path='/role-access' element={<RoleAccessPage />} />
        <Route exact path='/sign-in' element={<SignInPage />} />
        <Route exact path='/sign-up' element={<SignUpPage />} />
        <Route exact path='/star-rating' element={<StarRatingPage />} />
        <Route exact path='/starred' element={<StarredPage />} />
        <Route exact path='/switch' element={<SwitchPage />} />
        <Route exact path='/table-basic' element={<TableBasicPage />} />
        <Route exact path='/table-data' element={<TableDataPage />} />
        <Route exact path='/open-tasks' element={<OpenTask />} />
        <Route exact path='/completed-tasks' element={<CompletedTask />} />
        <Route exact path='/details' element={<Details />} />
        <Route exact path='/preview' element={<Preview />} />
        <Route exact path='/archived-tasks' element={<Archivedtask />} />
        <Route exact path='/all-tasks' element={<Alltask />} />
        <Route exact path='/tabs' element={<TabsPage />} />
        <Route exact path='/tags' element={<TagsPage />} />
        <Route exact path='/terms-condition' element={<TermsConditionPage />} />
        <Route
          exact
          path='/text-generator-new'
          element={<TextGeneratorNewPage />}
        />
        <Route exact path='/text-generator' element={<TextGeneratorPage />} />
        <Route exact path='/theme' element={<ThemePage />} />
        <Route exact path='/tooltip' element={<TooltipPage />} />
        <Route exact path='/typography' element={<TypographyPage />} />
        <Route exact path='/users-grid' element={<UsersGridPage />} />
        <Route exact path='/all-users' element={<UsersListPage />} />
        <Route exact path='/view-details' element={<ViewDetailsPage />} />
        <Route exact path='/video-generator' element={<VideoGeneratorPage />} />
        <Route exact path='/videos' element={<VideosPage />} />
        <Route exact path='/view-profile' element={<ViewProfilePage />} />
        <Route exact path='/voice-generator' element={<VoiceGeneratorPage />} />
        <Route exact path='/wallet' element={<WalletPage />} />
        <Route exact path='/widgets' element={<WidgetsPage />} />
        <Route exact path='/NewEnquiries' element={< NewEnquiriesPage />} />
        <Route exact path='/CallLater' element={< CallLaterPage />} />
        <Route exact path='/MissedCall' element={< MissedCallPage/>} />
        <Route exact path='/ReassignedToMe' element={< ReassignedToMePage/>} />
        <Route exact path='/UnreadEmailS' element={< UnreadEmailPage/>} />
        <Route exact path='/MissedFollowups' element={< MissedFollowupsPage/>} />
        <Route exact path='/UntouchedLeadsAttempts1' element={<UntouchedLeadsAttemptsPage1/>} />
        <Route exact path='/UntouchedLeadsAttempts2' element={<UntouchedLeadsAttemptsPage2/>} />
        <Route exact path='/UntouchedLeadsAttempts3' element={<UntouchedLeadsAttemptsPage3/>} />
        <Route exact path='/Followups' element={< FollowupsPage />} />
        <Route exact path='/SiteVists' element={< SiteVistsPage/>} />
         <Route exact path='/WhatApp' element={< WhatAppPage />} />
         <Route exact path='/BlukClickToCalls' element={< BlukClickPage />} />

        <Route exact path='*' element={<ErrorPage />} />
      </Routes>}
    </BrowserRouter>
  );
}

export default App;
