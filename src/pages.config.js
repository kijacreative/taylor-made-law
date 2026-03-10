/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Activate from './pages/Activate';
import AdminBlog from './pages/AdminBlog';
import AdminBlogEdit from './pages/AdminBlogEdit';
import AdminCases from './pages/AdminCases';
import AdminCircles from './pages/AdminCircles';
import AdminDashboard from './pages/AdminDashboard';
import AdminLawyerApplications from './pages/AdminLawyerApplications';
import AdminLawyers from './pages/AdminLawyers';
import AdminLeadDetail from './pages/AdminLeadDetail';
import AdminLeads from './pages/AdminLeads';
import AdminLogin from './pages/AdminLogin';
import AdminNetworkReview from './pages/AdminNetworkReview';
import AdminPopupEdit from './pages/AdminPopupEdit';
import AdminPopups from './pages/AdminPopups';
import AdminResourceEdit from './pages/AdminResourceEdit';
import AdminResources from './pages/AdminResources';
import AdminTeam from './pages/AdminTeam';
import AuthRedirect from './pages/AuthRedirect';
import Blog from './pages/Blog';
import CaseDetail from './pages/CaseDetail';
import CaseExchange from './pages/CaseExchange';
import Content from './pages/Content';
import ContentDetail from './pages/ContentDetail';
import CreateGroup from './pages/CreateGroup';
import FindLawyer from './pages/FindLawyer';
import ForLawyers from './pages/ForLawyers';
import ForgotPassword from './pages/ForgotPassword';
import GroupDetail from './pages/GroupDetail';
import GroupInvitations from './pages/GroupInvitations';
import Groups from './pages/Groups';
import Home from './pages/Home';
import JoinNetwork from './pages/JoinNetwork';
import LawyerBlog from './pages/LawyerBlog';
import LawyerBlogDetail from './pages/LawyerBlogDetail';
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerLogin from './pages/LawyerLogin';
import LawyerResourceDetail from './pages/LawyerResourceDetail';
import LawyerResources from './pages/LawyerResources';
import LawyerSettings from './pages/LawyerSettings';
import MassTortDetail from './pages/MassTortDetail';
import MassTorts from './pages/MassTorts';
import MyCases from './pages/MyCases';
import ResetPassword from './pages/ResetPassword';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Activate": Activate,
    "AdminBlog": AdminBlog,
    "AdminBlogEdit": AdminBlogEdit,
    "AdminCases": AdminCases,
    "AdminCircles": AdminCircles,
    "AdminDashboard": AdminDashboard,
    "AdminLawyerApplications": AdminLawyerApplications,
    "AdminLawyers": AdminLawyers,
    "AdminLeadDetail": AdminLeadDetail,
    "AdminLeads": AdminLeads,
    "AdminLogin": AdminLogin,
    "AdminNetworkReview": AdminNetworkReview,
    "AdminPopupEdit": AdminPopupEdit,
    "AdminPopups": AdminPopups,
    "AdminResourceEdit": AdminResourceEdit,
    "AdminResources": AdminResources,
    "AdminTeam": AdminTeam,
    "AuthRedirect": AuthRedirect,
    "Blog": Blog,
    "CaseDetail": CaseDetail,
    "CaseExchange": CaseExchange,
    "Content": Content,
    "ContentDetail": ContentDetail,
    "CreateGroup": CreateGroup,
    "FindLawyer": FindLawyer,
    "ForLawyers": ForLawyers,
    "ForgotPassword": ForgotPassword,
    "GroupDetail": GroupDetail,
    "GroupInvitations": GroupInvitations,
    "Groups": Groups,
    "Home": Home,
    "JoinNetwork": JoinNetwork,
    "LawyerBlog": LawyerBlog,
    "LawyerBlogDetail": LawyerBlogDetail,
    "LawyerDashboard": LawyerDashboard,
    "LawyerLogin": LawyerLogin,
    "LawyerResourceDetail": LawyerResourceDetail,
    "LawyerResources": LawyerResources,
    "LawyerSettings": LawyerSettings,
    "MassTortDetail": MassTortDetail,
    "MassTorts": MassTorts,
    "MyCases": MyCases,
    "ResetPassword": ResetPassword,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};