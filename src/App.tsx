import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { EngagementsPage } from "./pages/EngagementsPage";
import { SitesPage } from "./pages/SitesPage";
import { UpdatesPage } from "./pages/UpdatesPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="engagements" element={<EngagementsPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="updates" element={<UpdatesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
