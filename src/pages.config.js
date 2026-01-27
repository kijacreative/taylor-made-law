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
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerSettings from './pages/LawyerSettings';
import MyCases from './pages/MyCases';
import Home from './pages/Home';
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
    "LawyerDashboard": LawyerDashboard,
    "LawyerSettings": LawyerSettings,
    "MyCases": MyCases,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};