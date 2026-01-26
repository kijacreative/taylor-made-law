import Home from './pages/Home';
import FindLawyer from './pages/FindLawyer';
import ForLawyers from './pages/ForLawyers';
import LawyerDashboard from './pages/LawyerDashboard';
import CaseExchange from './pages/CaseExchange';
import CaseDetail from './pages/CaseDetail';
import MyCases from './pages/MyCases';
import LawyerSettings from './pages/LawyerSettings';
import AdminDashboard from './pages/AdminDashboard';
import AdminLeads from './pages/AdminLeads';
import AdminLeadDetail from './pages/AdminLeadDetail';


export const PAGES = {
    "Home": Home,
    "FindLawyer": FindLawyer,
    "ForLawyers": ForLawyers,
    "LawyerDashboard": LawyerDashboard,
    "CaseExchange": CaseExchange,
    "CaseDetail": CaseDetail,
    "MyCases": MyCases,
    "LawyerSettings": LawyerSettings,
    "AdminDashboard": AdminDashboard,
    "AdminLeads": AdminLeads,
    "AdminLeadDetail": AdminLeadDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};