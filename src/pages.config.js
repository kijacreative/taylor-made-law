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
import AdminCases from './pages/AdminCases';
import AdminDashboard from './pages/AdminDashboard';
import AdminLawyers from './pages/AdminLawyers';
import AdminLeadDetail from './pages/AdminLeadDetail';
import AdminLeads from './pages/AdminLeads';
import AuthRedirect from './pages/AuthRedirect';
import CaseDetail from './pages/CaseDetail';
import CaseExchange from './pages/CaseExchange';
import FindLawyer from './pages/FindLawyer';
import ForLawyers from './pages/ForLawyers';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerSettings from './pages/LawyerSettings';
import MyCases from './pages/MyCases';
import ResetPassword from './pages/ResetPassword';
import MassTorts from './pages/MassTorts';
import MassTortDetail from './pages/MassTortDetail';
import Content from './pages/Content';
import ContentDetail from './pages/ContentDetail';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminCases": AdminCases,
    "AdminDashboard": AdminDashboard,
    "AdminLawyers": AdminLawyers,
    "AdminLeadDetail": AdminLeadDetail,
    "AdminLeads": AdminLeads,
    "AuthRedirect": AuthRedirect,
    "CaseDetail": CaseDetail,
    "CaseExchange": CaseExchange,
    "FindLawyer": FindLawyer,
    "ForLawyers": ForLawyers,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "LawyerDashboard": LawyerDashboard,
    "LawyerSettings": LawyerSettings,
    "MyCases": MyCases,
    "ResetPassword": ResetPassword,
    "MassTorts": MassTorts,
    "MassTortDetail": MassTortDetail,
    "Content": Content,
    "ContentDetail": ContentDetail,
    "Groups": Groups,
    "CreateGroup": CreateGroup,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};