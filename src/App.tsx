import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage").then((m) => ({ default: m.RoadmapPage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const EngagementsPage = lazy(() => import("./pages/EngagementsPage").then((m) => ({ default: m.EngagementsPage })));
const TravelPage = lazy(() => import("./pages/TravelPage").then((m) => ({ default: m.TravelPage })));
const SitesPage = lazy(() => import("./pages/SitesPage").then((m) => ({ default: m.SitesPage })));
const UpdatesPage = lazy(() => import("./pages/UpdatesPage").then((m) => ({ default: m.UpdatesPage })));
const QuarterlyPage = lazy(() => import("./pages/QuarterlyPage").then((m) => ({ default: m.QuarterlyPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

export default function App(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="engagements" element={<EngagementsPage />} />
          <Route path="travel" element={<TravelPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="updates" element={<UpdatesPage />} />
          <Route path="quarterly" element={<QuarterlyPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
