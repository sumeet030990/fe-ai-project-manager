"use client";
import React, { useCallback } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { getProject } from "@/services/projects";
import AIConfigTab from "./tabs/AIConfigTab";
import ModulesTab from "./tabs/ModulesTab";
import TeamTab from "./tabs/TeamTab";
import TechStacksTab from "./tabs/TechStacksTab";

const TABS = ["modules", "team", "techstacks", "aiconfig"] as const;
type TabSlug = (typeof TABS)[number];

const TAB_LABELS: Record<TabSlug, string> = {
  modules: "Modules",
  team: "Team",
  techstacks: "Tech Stacks & Plugins",
  aiconfig: "AI Config",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const rawTab = searchParams.get("tab") as TabSlug | null;
  const activeTab: TabSlug = rawTab && TABS.includes(rawTab) ? rawTab : "modules";
  const tabIndex = TABS.indexOf(activeTab);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", TABS[newIndex]);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  if (isLoading)
    return (
      <PageContainer title="Project" description="">
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );

  if (isError || !project)
    return (
      <PageContainer title="Project" description="">
        <Typography color="error" textAlign="center" py={8}>
          Failed to load project.
        </Typography>
      </PageContainer>
    );

  return (
    <PageContainer title={project.name} description={project.description ?? ""}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => router.push("/projects")} size="small">
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h4" fontWeight={600}>
            {project.name}
          </Typography>
          {project.description && (
            <Typography variant="body2" color="textSecondary">
              {project.description}
            </Typography>
          )}
        </Box>
        <Chip
          label={project.status}
          color={project.status === "active" ? "success" : "default"}
          size="small"
        />
        <Chip
          label={project.is_active ? "Active" : "Inactive"}
          color={project.is_active ? "success" : "default"}
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          {TABS.map((slug) => (
            <Tab key={slug} label={TAB_LABELS[slug]} />
          ))}
        </Tabs>
      </Paper>

      <Box>
        {activeTab === "modules" && <ModulesTab projectId={projectId} />}
        {activeTab === "team" && <TeamTab projectId={projectId} />}
        {activeTab === "techstacks" && <TechStacksTab projectId={projectId} />}
        {activeTab === "aiconfig" && <AIConfigTab projectId={projectId} />}
      </Box>
    </PageContainer>
  );
}
