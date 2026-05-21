"use client";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCloudDownload,
  IconCloudUpload,
  IconFlag,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconTarget,
  IconTicket,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import { getProject } from "@/services/projects";
import {
  addStoriesToSprint,
  aiPlanSprint,
  completeSprint,
  createSprint,
  deleteSprint,
  getActiveSprintBoard,
  getBacklog,
  getSprints,
  getSprintStories,
  pushSprintToJira,
  removeStoriesFromSprint,
  startSprint,
  syncSprintsFromJira,
} from "@/services/sprints";
import { updateStory } from "@/services/stories";
import {
  ActiveSprintResponse,
  BacklogModuleGroup,
  SprintAIPlanResult,
  SprintResponse,
  SprintStatus,
  SprintSyncResult,
  StoryResponse,
  StoryStatus,
} from "@/types";

// ── helpers ──────────────────────────────────────────────────────────────────

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const STORY_STATUSES: StoryStatus[] = [
  "draft",
  "review",
  "approved",
  "rejected",
  "in_progress",
  "done",
];

const COLUMN_CONFIG = [
  { key: "todo" as const, label: "To Do", color: "#5D87FF" },
  { key: "in_progress" as const, label: "In Progress", color: "#FFAE1F" },
  { key: "in_review" as const, label: "In Review", color: "#49BEFF" },
  { key: "done" as const, label: "Done", color: "#13DEB9" },
];

function storyStatusColor(s: string): "default" | "info" | "success" | "error" | "warning" | "primary" {
  if (s === "review") return "info";
  if (s === "approved") return "success";
  if (s === "rejected") return "error";
  if (s === "in_progress") return "warning";
  if (s === "done") return "primary";
  return "default";
}

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function assigneeName(s: StoryResponse) {
  if (!s.assignee) return null;
  return [s.assignee.first_name, s.assignee.last_name].filter(Boolean).join(" ") || s.assignee.email;
}

// ── Story card (kanban) ───────────────────────────────────────────────────────

interface StoryCardProps {
  story: StoryResponse;
  onRemove: (story: StoryResponse) => void;
  onStatusClick: (story: StoryResponse, el: HTMLElement) => void;
}

function StoryCard({ story, onRemove, onStatusClick }: StoryCardProps) {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5,
        mb: 1,
        borderRadius: 1,
        "&:hover": { boxShadow: 3 },
        borderLeft: "3px solid",
        borderLeftColor: story.status === "done" ? "#13DEB9" : story.status === "in_progress" ? "#FFAE1F" : "#5D87FF",
      }}
    >
      {story.jira_issue_key && (
        <Box mb={0.5}>
          <Chip
            label={story.jira_issue_key}
            size="small"
            color="info"
            variant="outlined"
            icon={<IconTicket size={10} />}
            sx={{ fontSize: "0.6rem", height: 18 }}
          />
        </Box>
      )}
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          mb: 1,
          lineHeight: 1.4,
        }}
      >
        {story.title}
      </Typography>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" gap={0.5} alignItems="center">
          {story.story_points != null && (
            <Chip
              label={`${story.story_points}pt`}
              size="small"
              color={story.story_points <= 3 ? "success" : "warning"}
              variant="outlined"
              sx={{ fontSize: "0.6rem", height: 18, px: 0.5 }}
            />
          )}
          {assigneeName(story) && (
            <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 80 }}>
              {assigneeName(story)}
            </Typography>
          )}
        </Box>
        <Box display="flex">
          <Tooltip title="Change status">
            <IconButton size="small" onClick={(e) => onStatusClick(story, e.currentTarget)}>
              <Chip
                label={story.status.replace("_", " ")}
                color={storyStatusColor(story.status)}
                size="small"
                sx={{ fontSize: "0.55rem", height: 16, cursor: "pointer" }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from sprint">
            <IconButton size="small" color="error" onClick={() => onRemove(story)} sx={{ ml: 0.5 }}>
              <IconX size={13} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SprintPlanningPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  // Dialogs / UI state
  const [newSprintOpen, setNewSprintOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });
  const [deleteTarget, setDeleteTarget] = useState<SprintResponse | null>(null);
  const [startTarget, setStartTarget] = useState<SprintResponse | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [aiPlanTargetSprint, setAiPlanTargetSprint] = useState<SprintResponse | null>(null);
  const [aiCapacity, setAiCapacity] = useState("30");
  const [aiContext, setAiContext] = useState("");
  const [aiConfigId, setAiConfigId] = useState("");
  const [aiModuleIds, setAiModuleIds] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<SprintAIPlanResult | null>(null);
  const [aiSelectedIds, setAiSelectedIds] = useState<string[]>([]);
  const [aiAddSectionOpen, setAiAddSectionOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<SprintSyncResult | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPlanning, setExpandedPlanning] = useState<Record<string, boolean>>({});

  // Add-to-sprint dialog
  const [addToSprintStory, setAddToSprintStory] = useState<StoryResponse | null>(null);
  // Preserved sprint ID for AI plan apply (aiPlanTargetSprint is cleared when the plan dialog closes)
  const [aiPlanSprintId, setAiPlanSprintId] = useState<string | null>(null);

  // Status change menu
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);
  const [statusMenuStory, setStatusMenuStory] = useState<StoryResponse | null>(null);

  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => getSprints(projectId),
    enabled: !!projectId,
  });

  const activeSprint = sprints.find((s) => s.status === "active") ?? null;
  const planningSprints = sprints.filter((s) => s.status === "planning");

  const {
    data: activeBoard,
    isLoading: boardLoading,
  } = useQuery<ActiveSprintResponse>({
    queryKey: ["sprint-board", projectId],
    queryFn: () => getActiveSprintBoard(projectId),
    enabled: !!activeSprint,
    retry: false,
  });

  const { data: backlog, isLoading: backlogLoading } = useQuery({
    queryKey: ["backlog", projectId],
    queryFn: () => getBacklog(projectId),
    enabled: !!projectId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprint-board", projectId] });
    queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprint-stories", projectId] });
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      createSprint(projectId, {
        name: sprintForm.name,
        goal: sprintForm.goal || undefined,
        start_date: sprintForm.start_date || undefined,
        end_date: sprintForm.end_date || undefined,
      }),
    onSuccess: () => {
      invalidateAll();
      setNewSprintOpen(false);
      setSprintForm({ name: "", goal: "", start_date: "", end_date: "" });
      toast("Sprint created", "success");
    },
    onError: () => toast("Failed to create sprint", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (sprintId: string) => deleteSprint(projectId, sprintId),
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast("Sprint deleted", "success");
    },
    onError: () => toast("Failed to delete sprint", "error"),
  });

  const startMutation = useMutation({
    mutationFn: (sprintId: string) => startSprint(projectId, sprintId),
    onSuccess: () => {
      invalidateAll();
      setStartTarget(null);
      toast("Sprint started", "success");
    },
    onError: (err: any) => {
      setStartTarget(null);
      toast(err?.response?.data?.detail || "Failed to start sprint", "error");
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeSprint(projectId, activeSprint!.id),
    onSuccess: () => {
      invalidateAll();
      setCompleteOpen(false);
      toast("Sprint completed. Incomplete stories moved to backlog.", "success");
    },
    onError: () => toast("Failed to complete sprint", "error"),
  });

  const addStoriesMutation = useMutation({
    mutationFn: ({ sprintId, storyIds }: { sprintId: string; storyIds: string[] }) =>
      addStoriesToSprint(projectId, sprintId, { story_ids: storyIds }),
    onSuccess: () => {
      invalidateAll();
      setAddToSprintStory(null);
      toast("Story added to sprint", "success");
    },
    onError: () => toast("Failed to add story", "error"),
  });

  const removeStoryMutation = useMutation({
    mutationFn: ({ sprintId, storyId }: { sprintId: string; storyId: string }) =>
      removeStoriesFromSprint(projectId, sprintId, { story_ids: [storyId] }),
    onSuccess: () => {
      invalidateAll();
      toast("Story moved to backlog", "success");
    },
    onError: () => toast("Failed to remove story", "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ story, status }: { story: StoryResponse; status: StoryStatus }) =>
      updateStory(story.module_id, story.id, { status }),
    onSuccess: () => {
      invalidateAll();
      setStatusMenuAnchor(null);
      setStatusMenuStory(null);
      toast("Status updated", "success");
    },
    onError: () => toast("Failed to update status", "error"),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncSprintsFromJira(projectId),
    onSuccess: (result) => {
      invalidateAll();
      setSyncResult(result);
    },
    onError: () => toast("Failed to sync from JIRA", "error"),
  });

  const pushJiraMutation = useMutation({
    mutationFn: (sprintId: string) => pushSprintToJira(projectId, sprintId),
    onSuccess: () => {
      invalidateAll();
      toast("Sprint pushed to JIRA", "success");
    },
    onError: () => toast("Failed to push to JIRA", "error"),
  });

  const aiPlanMutation = useMutation({
    mutationFn: () =>
      aiPlanSprint(projectId, aiPlanTargetSprint!.id, {
        capacity: parseInt(aiCapacity) || 30,
        context: aiContext || undefined,
        config_id: aiConfigId || undefined,
        module_ids: aiModuleIds.length > 0 ? aiModuleIds : undefined,
      }),
    onSuccess: (result) => {
      setAiPlanSprintId(aiPlanTargetSprint!.id);
      setAiPlanTargetSprint(null);
      setAiModuleIds([]);
      setAiResult(result);
      setAiSelectedIds(result.selected_stories.map((s) => s.id));
      setAiAddSectionOpen(false);
    },
    onError: () => toast("AI planning failed", "error"),
  });

  const applyAiPlanMutation = useMutation({
    mutationFn: () =>
      addStoriesToSprint(projectId, aiPlanSprintId!, {
        story_ids: aiSelectedIds,
      }),
    onSuccess: () => {
      invalidateAll();
      const count = aiSelectedIds.length;
      setAiResult(null);
      setAiSelectedIds([]);
      setAiAddSectionOpen(false);
      setAiPlanSprintId(null);
      toast(`${count} stories added to sprint`, "success");
    },
    onError: () => toast("Failed to apply AI plan", "error"),
  });

  // ── Render helpers ─────────────────────────────────────────────────────────

  const isLoading = sprintsLoading || backlogLoading;

  // Build a flat lookup of all stories available for AI result (AI-selected + full backlog)
  const allStoryById = useMemo(() => {
    const map: Record<string, StoryResponse> = {};
    aiResult?.selected_stories.forEach((s) => { map[s.id] = s; });
    backlog?.modules.forEach((m) => m.stories.forEach((s) => { map[s.id] = s; }));
    return map;
  }, [aiResult, backlog]);

  const moduleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    backlog?.modules.forEach((m) => { map[m.module_id] = m.module_name; });
    return map;
  }, [backlog]);

  // Group currently selected stories by module for the result dialog
  const selectedStoriesByModule = useMemo(() => {
    const groups: Record<string, { module_name: string; stories: StoryResponse[] }> = {};
    aiSelectedIds.forEach((id) => {
      const s = allStoryById[id];
      if (!s) return;
      const mName = moduleNameById[s.module_id] ?? "Unknown Module";
      if (!groups[s.module_id]) groups[s.module_id] = { module_name: mName, stories: [] };
      groups[s.module_id].stories.push(s);
    });
    return Object.values(groups);
  }, [aiSelectedIds, allStoryById, moduleNameById]);

  // Backlog stories not yet in the selection, grouped by module
  const unselectedBacklogByModule = useMemo(() => {
    const selected = new Set(aiSelectedIds);
    return (backlog?.modules ?? [])
      .map((m) => ({ ...m, stories: m.stories.filter((s) => !selected.has(s.id)) }))
      .filter((m) => m.stories.length > 0);
  }, [aiSelectedIds, backlog]);

  // Dynamic total points for current selection
  const selectedTotalPoints = useMemo(
    () => aiSelectedIds.reduce((sum, id) => sum + (allStoryById[id]?.story_points ?? 0), 0),
    [aiSelectedIds, allStoryById],
  );

  const totalColumns = activeBoard
    ? COLUMN_CONFIG.reduce((acc, col) => acc + (activeBoard.columns[col.key]?.length ?? 0), 0)
    : 0;

  const progressPct = activeBoard && activeBoard.total_points > 0
    ? Math.round((activeBoard.completed_points / activeBoard.total_points) * 100)
    : 0;

  return (
    <PageContainer title="Sprint Planning" description="">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => router.push(`/projects/${projectId}`)} size="small">
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="caption" color="textSecondary">
            {project?.name} / Sprint Planning
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            Sprint Board
          </Typography>
        </Box>
        <Tooltip title="Sync sprints and issue assignments from JIRA">
          <Button
            variant="outlined"
            color="info"
            startIcon={syncMutation.isPending ? <CircularProgress size={16} /> : <IconCloudDownload size={16} />}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            Sync from JIRA
          </Button>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => setNewSprintOpen(true)}
        >
          New Sprint
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ── Active Sprint ── */}
          {activeSprint ? (
            <Paper elevation={2} sx={{ mb: 3, overflow: "hidden" }}>
              {/* Sprint header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  background: "linear-gradient(90deg, #5D87FF15 0%, #49BEFF10 100%)",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
                  <Box flexGrow={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip label="ACTIVE SPRINT" color="primary" size="small" sx={{ fontWeight: 700, fontSize: "0.65rem" }} />
                      <Typography variant="h5" fontWeight={700}>
                        {activeSprint.name}
                      </Typography>
                      {activeSprint.jira_sprint_id && (
                        <Chip
                          label={`JIRA #${activeSprint.jira_sprint_id}`}
                          size="small"
                          color="info"
                          variant="outlined"
                          icon={<IconTicket size={10} />}
                          sx={{ fontSize: "0.6rem" }}
                        />
                      )}
                    </Box>
                    {activeSprint.goal && (
                      <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <IconTarget size={14} color="#5D87FF" />
                        <Typography variant="body2" color="textSecondary">
                          {activeSprint.goal}
                        </Typography>
                      </Box>
                    )}
                    {(activeSprint.start_date || activeSprint.end_date) && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <IconCalendar size={14} color="#888" />
                        <Typography variant="caption" color="textSecondary">
                          {[formatDate(activeSprint.start_date), formatDate(activeSprint.end_date)]
                            .filter(Boolean)
                            .join(" → ")}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box display="flex" gap={1} flexShrink={0} flexWrap="wrap" justifyContent="flex-end">
                    <Tooltip title="Push sprint and issue assignments to JIRA">
                      <Button
                        variant="outlined"
                        color="info"
                        size="small"
                        startIcon={pushJiraMutation.isPending ? <CircularProgress size={14} /> : <IconCloudUpload size={14} />}
                        onClick={() => pushJiraMutation.mutate(activeSprint.id)}
                        disabled={pushJiraMutation.isPending}
                      >
                        Push to JIRA
                      </Button>
                    </Tooltip>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<IconCheck size={14} />}
                      onClick={() => setCompleteOpen(true)}
                    >
                      Complete Sprint
                    </Button>
                  </Box>
                </Box>

                {/* Progress bar */}
                {activeBoard && (
                  <Box mt={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        {totalColumns} stories
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {activeBoard.completed_points} / {activeBoard.total_points} pts ({progressPct}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      color="success"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}
              </Box>

              {/* Kanban columns */}
              {boardLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : activeBoard ? (
                <Box
                  display="grid"
                  sx={{
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" },
                  }}
                >
                  {COLUMN_CONFIG.map((col, i) => {
                    const colStories = activeBoard.columns[col.key] ?? [];
                    return (
                      <Box
                        key={col.key}
                        sx={{
                          p: 2,
                          borderRight: i < 3 ? "1px solid" : "none",
                          borderColor: "divider",
                          minHeight: 200,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor: col.color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ color: col.color, letterSpacing: "0.05em", textTransform: "uppercase" }}
                          >
                            {col.label}
                          </Typography>
                          <Chip
                            label={colStories.length}
                            size="small"
                            sx={{ height: 18, fontSize: "0.65rem", ml: "auto" }}
                          />
                        </Box>
                        {colStories.length === 0 ? (
                          <Typography variant="caption" color="textSecondary" display="block" textAlign="center" py={2}>
                            No stories
                          </Typography>
                        ) : (
                          colStories.map((story) => (
                            <StoryCard
                              key={story.id}
                              story={story}
                              onRemove={(s) =>
                                removeStoryMutation.mutate({ sprintId: activeSprint.id, storyId: s.id })
                              }
                              onStatusClick={(s, el) => {
                                setStatusMenuStory(s);
                                setStatusMenuAnchor(el);
                              }}
                            />
                          ))
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Box px={3} py={3}>
                  <Typography color="textSecondary">No stories in the active sprint yet.</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Add stories from the Backlog section below.
                  </Typography>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper
              elevation={0}
              variant="outlined"
              sx={{ p: 3, mb: 3, textAlign: "center", borderStyle: "dashed" }}
            >
              <IconFlag size={32} color="#aaa" />
              <Typography variant="h6" color="textSecondary" mt={1}>
                No active sprint
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Create a sprint and start it to begin tracking progress.
              </Typography>
              <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setNewSprintOpen(true)}>
                Create Sprint
              </Button>
            </Paper>
          )}

          {/* ── Planning Sprints ── */}
          {planningSprints.length > 0 && (
            <Box mb={3}>
              {planningSprints.map((sprint) => {
                const isExpanded = expandedPlanning[sprint.id] ?? false;
                return (
                  <Paper key={sprint.id} elevation={1} sx={{ mb: 1.5, overflow: "hidden" }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      px={2}
                      py={1.5}
                      sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                      onClick={() =>
                        setExpandedPlanning((p) => ({ ...p, [sprint.id]: !isExpanded }))
                      }
                    >
                      {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      <Box ml={1} flexGrow={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label="PLANNING" size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            {sprint.name}
                          </Typography>
                          {sprint.jira_sprint_id && (
                            <Chip
                              label={`JIRA #${sprint.jira_sprint_id}`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ fontSize: "0.6rem" }}
                            />
                          )}
                        </Box>
                        {sprint.goal && (
                          <Typography variant="caption" color="textSecondary">
                            {sprint.goal}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" gap={1} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="AI selects backlog stories for this sprint based on capacity">
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<IconRobot size={14} />}
                            onClick={() => setAiPlanTargetSprint(sprint)}
                          >
                            AI Plan
                          </Button>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={startMutation.isPending ? <CircularProgress size={12} /> : <IconFlag size={14} />}
                          disabled={startMutation.isPending}
                          onClick={() => setStartTarget(sprint)}
                        >
                          Start Sprint
                        </Button>
                        <Tooltip title="Delete sprint">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(sprint)}
                          >
                            <IconTrash size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Collapse in={isExpanded}>
                      <Divider />
                      <Box px={3} py={2}>
                        <PlanningSprintStories projectId={projectId} sprintId={sprint.id} />
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Box>
          )}

          {/* ── Backlog ── */}
          <Paper elevation={1}>
            <Box
              px={2.5}
              py={2}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                background: "linear-gradient(90deg, #f5f7ff 0%, #f8f8f8 100%)",
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <IconPackage size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Backlog
                </Typography>
                {backlog && (
                  <>
                    <Chip
                      label={`${backlog.total_stories} stories`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${backlog.total_points} pts`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </>
                )}
              </Box>
            </Box>

            {backlogLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : !backlog || backlog.modules.length === 0 ? (
              <Box px={3} py={4} textAlign="center">
                <Typography color="textSecondary">
                  All stories are assigned to sprints, or there are no stories yet.
                </Typography>
              </Box>
            ) : (
              backlog.modules.map((group) => (
                <BacklogGroup
                  key={group.module_id}
                  group={group}
                  expanded={expandedGroups[group.module_id] ?? true}
                  onToggle={() =>
                    setExpandedGroups((p) => ({
                      ...p,
                      [group.module_id]: !(p[group.module_id] ?? true),
                    }))
                  }
                  onAddToSprint={(story) => setAddToSprintStory(story)}
                />
              ))
            )}
          </Paper>
        </>
      )}

      {/* ── Add to Sprint Dialog ── */}
      <Dialog open={!!addToSprintStory} onClose={() => setAddToSprintStory(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconPlus size={18} />
            Add to Sprint
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {addToSprintStory && (
            <Typography variant="body2" color="textSecondary" mb={2} sx={{ fontStyle: "italic" }}>
              &ldquo;{addToSprintStory.title.length > 80
                ? addToSprintStory.title.slice(0, 80) + "…"
                : addToSprintStory.title}&rdquo;
            </Typography>
          )}
          {[...planningSprints, ...(activeSprint ? [activeSprint] : [])].length === 0 ? (
            <Alert severity="info">
              No planning or active sprints. Create a sprint first.
            </Alert>
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {[...planningSprints, ...(activeSprint ? [activeSprint] : [])].map((sprint) => (
                <Box
                  key={sprint.id}
                  onClick={() => {
                    if (addToSprintStory && !addStoriesMutation.isPending) {
                      addStoriesMutation.mutate({ sprintId: sprint.id, storyIds: [addToSprintStory.id] });
                    }
                  }}
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    cursor: addStoriesMutation.isPending ? "default" : "pointer",
                    opacity: addStoriesMutation.isPending ? 0.5 : 1,
                    pointerEvents: addStoriesMutation.isPending ? "none" : "auto",
                    "&:hover": { bgcolor: addStoriesMutation.isPending ? "transparent" : "action.hover" },
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box flexGrow={1}>
                    <Typography variant="body2" fontWeight={600}>{sprint.name}</Typography>
                    {sprint.goal && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {sprint.goal}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={sprint.status}
                    size="small"
                    color={sprint.status === "active" ? "primary" : "default"}
                    sx={{ fontSize: "0.6rem", height: 20 }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {addStoriesMutation.isPending && (
            <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="textSecondary">Adding to sprint…</Typography>
            </Box>
          )}
          <Button onClick={() => setAddToSprintStory(null)} disabled={addStoriesMutation.isPending}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Status change menu ── */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={!!statusMenuAnchor}
        onClose={() => { setStatusMenuAnchor(null); setStatusMenuStory(null); }}
      >
        {STORY_STATUSES.map((s) => (
          <MenuItem
            key={s}
            selected={statusMenuStory?.status === s}
            onClick={() =>
              statusMenuStory && statusMutation.mutate({ story: statusMenuStory, status: s })
            }
            disabled={statusMutation.isPending}
          >
            <Chip
              label={s.replace("_", " ")}
              color={storyStatusColor(s)}
              size="small"
              sx={{ fontSize: "0.7rem" }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* ── New Sprint Dialog ── */}
      <Dialog open={newSprintOpen} onClose={() => setNewSprintOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Sprint</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                label="Sprint Name"
                fullWidth
                required
                value={sprintForm.name}
                onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sprint 1"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Sprint Goal (optional)"
                fullWidth
                multiline
                rows={2}
                value={sprintForm.goal}
                onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))}
                placeholder="What is the goal of this sprint?"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={sprintForm.start_date}
                onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={sprintForm.end_date}
                onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewSprintOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !sprintForm.name.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Create Sprint"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Start Sprint Confirmation ── */}
      <Dialog open={!!startTarget} onClose={() => setStartTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Start Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Start <strong>&quot;{startTarget?.name}&quot;</strong>?
          </Typography>
          {activeSprint && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Sprint <strong>&quot;{activeSprint.name}&quot;</strong> is already active. Complete it before starting a new one.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setStartTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={startMutation.isPending || !!activeSprint}
            onClick={() => startTarget && startMutation.mutate(startTarget.id)}
          >
            {startMutation.isPending ? "Starting..." : "Start Sprint"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Complete Sprint Confirmation ── */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Complete <strong>&quot;{activeSprint?.name}&quot;</strong>?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Incomplete stories (not Done) will be moved back to the Backlog.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
          >
            {completeMutation.isPending ? "Completing..." : "Complete Sprint"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Sprint Confirmation ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>&quot;{deleteTarget?.name}&quot;</strong>? Assigned stories will be moved to the backlog.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── AI Plan Dialog ── */}
      <Dialog
        open={!!aiPlanTargetSprint}
        onClose={() => { setAiPlanTargetSprint(null); setAiModuleIds([]); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconRobot size={20} />
            AI Sprint Planning — {aiPlanTargetSprint?.name}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {aiPlanTargetSprint?.goal && (
            <Box display="flex" alignItems="center" gap={0.5} mb={2} p={1.5}
              sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
              <IconTarget size={14} color="#5D87FF" />
              <Typography variant="body2" color="textSecondary">
                <strong>Goal:</strong> {aiPlanTargetSprint.goal}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="textSecondary" mb={2}>
            AI will select stories from the backlog that best fit the sprint goal within the story points capacity.
          </Typography>
          <Box mb={2}>
            <AIModelSelector projectId={projectId} value={aiConfigId} onChange={setAiConfigId} />
          </Box>
          <TextField
            label="Sprint Capacity (story points)"
            type="number"
            fullWidth
            value={aiCapacity}
            onChange={(e) => setAiCapacity(e.target.value)}
            sx={{ mb: 2 }}
          />
          {backlog && backlog.modules.length > 0 && (
            <Autocomplete
              multiple
              options={backlog.modules}
              getOptionLabel={(opt) => opt.module_name}
              value={backlog.modules.filter((m) => aiModuleIds.includes(m.module_id))}
              onChange={(_, selected) => setAiModuleIds(selected.map((m) => m.module_id))}
              disableCloseOnSelect
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="body2">{option.module_name}</Typography>
                    {option.jira_epic_key && (
                      <Typography variant="caption" color="textSecondary">{option.jira_epic_key}</Typography>
                    )}
                  </Box>
                </li>
              )}
              slotProps={{ chip: { size: "small", color: "secondary", variant: "outlined" } as object }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Focus Modules (optional)"
                  placeholder={aiModuleIds.length === 0 ? "All modules — pick one or more to focus AI" : ""}
                  helperText="AI will prioritize stories from selected modules"
                />
              )}
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            label="Additional Context (optional)"
            fullWidth
            multiline
            rows={3}
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            placeholder="e.g. Focus on backend APIs this sprint, skip testing stories..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setAiPlanTargetSprint(null); setAiModuleIds([]); }}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={aiPlanMutation.isPending ? <CircularProgress size={16} /> : <IconRobot size={16} />}
            onClick={() => aiPlanMutation.mutate()}
            disabled={aiPlanMutation.isPending}
          >
            {aiPlanMutation.isPending ? "Planning..." : "Generate Plan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── AI Plan Result Dialog ── */}
      <Dialog
        open={!!aiResult}
        onClose={() => { setAiResult(null); setAiSelectedIds([]); setAiAddSectionOpen(false); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconRobot size={20} />
            AI Sprint Plan
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {aiResult && (
            <>
              {/* Summary chips */}
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                <Chip label={`${aiSelectedIds.length} stories selected`} color="primary" size="small" />
                <Chip label={`${selectedTotalPoints} pts total`} color="success" size="small" />
                {aiSelectedIds.length !== aiResult.selected_stories.length && (
                  <Chip
                    label={`AI suggested ${aiResult.selected_stories.length}`}
                    variant="outlined"
                    size="small"
                    color="secondary"
                  />
                )}
              </Box>

              {/* AI Reasoning */}
              {aiResult.reasoning && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                    AI Reasoning
                  </Typography>
                  <Typography variant="body2">{aiResult.reasoning}</Typography>
                </Paper>
              )}

              {/* Selected stories grouped by module */}
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Selected Stories
              </Typography>
              {selectedStoriesByModule.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontStyle: "italic" }}>
                  No stories selected. Add stories from the backlog below.
                </Typography>
              ) : (
                selectedStoriesByModule.map((group) => (
                  <Box key={group.module_name} mb={1.5}>
                    {/* Module header */}
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
                      <IconPackage size={13} color="#5D87FF" />
                      <Chip
                        label={group.module_name}
                        size="small"
                        color="secondary"
                        sx={{ fontSize: "0.65rem", height: 20, fontWeight: 700 }}
                      />
                      <Chip
                        label={`${group.stories.length} stories · ${group.stories.reduce((s, st) => s + (st.story_points ?? 0), 0)} pts`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.6rem", height: 18 }}
                      />
                    </Box>
                    {/* Story rows */}
                    {group.stories.map((s) => (
                      <Box
                        key={s.id}
                        display="flex"
                        alignItems="center"
                        gap={1}
                        mb={0.5}
                        p={1}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        {s.jira_issue_key && (
                          <Chip
                            label={s.jira_issue_key}
                            size="small"
                            color="info"
                            variant="outlined"
                            icon={<IconTicket size={10} />}
                            sx={{ fontSize: "0.6rem", flexShrink: 0 }}
                          />
                        )}
                        <Typography variant="body2" flexGrow={1} sx={{ minWidth: 0 }}>
                          {s.title}
                        </Typography>
                        {s.story_points != null && (
                          <Chip
                            label={`${s.story_points}pt`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.6rem", flexShrink: 0 }}
                          />
                        )}
                        <Tooltip title="Remove from selection">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setAiSelectedIds((prev) => prev.filter((id) => id !== s.id))}
                            sx={{ flexShrink: 0 }}
                          >
                            <IconX size={13} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                ))
              )}

              {/* Add more stories section */}
              <Box
                mt={2}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  px={1.5}
                  py={1}
                  gap={1}
                  sx={{ cursor: "pointer", bgcolor: "grey.50", "&:hover": { bgcolor: "action.hover" } }}
                  onClick={() => setAiAddSectionOpen((v) => !v)}
                >
                  {aiAddSectionOpen ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                  <IconPlus size={14} color="#5D87FF" />
                  <Typography variant="subtitle2" fontWeight={700} flexGrow={1}>
                    Add More Stories
                  </Typography>
                  {unselectedBacklogByModule.length > 0 && (
                    <Chip
                      label={`${unselectedBacklogByModule.reduce((n, m) => n + m.stories.length, 0)} available`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.6rem", height: 18 }}
                    />
                  )}
                </Box>
                <Collapse in={aiAddSectionOpen}>
                  <Divider />
                  {unselectedBacklogByModule.length === 0 ? (
                    <Box px={2} py={1.5}>
                      <Typography variant="body2" color="textSecondary">
                        All backlog stories are already selected.
                      </Typography>
                    </Box>
                  ) : (
                    <Box px={1.5} py={1}>
                      {unselectedBacklogByModule.map((group) => (
                        <Box key={group.module_id} mb={1.5}>
                          {/* Module header */}
                          <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                            <IconPackage size={13} color="#5D87FF" />
                            <Chip
                              label={group.module_name}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 20, fontWeight: 700 }}
                            />
                            {group.jira_epic_key && (
                              <Chip
                                label={group.jira_epic_key}
                                size="small"
                                color="info"
                                variant="outlined"
                                icon={<IconTicket size={10} />}
                                sx={{ fontSize: "0.6rem", height: 18 }}
                              />
                            )}
                          </Box>
                          {/* Unselected story rows */}
                          {group.stories.map((s) => (
                            <Box
                              key={s.id}
                              display="flex"
                              alignItems="center"
                              gap={1}
                              mb={0.5}
                              p={1}
                              sx={{
                                border: "1px dashed",
                                borderColor: "divider",
                                borderRadius: 1,
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                            >
                              {s.jira_issue_key && (
                                <Chip
                                  label={s.jira_issue_key}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  icon={<IconTicket size={10} />}
                                  sx={{ fontSize: "0.6rem", flexShrink: 0 }}
                                />
                              )}
                              <Typography variant="body2" flexGrow={1} color="textSecondary" sx={{ minWidth: 0 }}>
                                {s.title}
                              </Typography>
                              {s.story_points != null && (
                                <Chip
                                  label={`${s.story_points}pt`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.6rem", flexShrink: 0 }}
                                />
                              )}
                              <Tooltip title="Add to selection">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => setAiSelectedIds((prev) => [...prev, s.id])}
                                  sx={{ flexShrink: 0 }}
                                >
                                  <IconPlus size={13} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Collapse>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setAiResult(null); setAiSelectedIds([]); setAiAddSectionOpen(false); }}>
            Discard
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={applyAiPlanMutation.isPending ? <CircularProgress size={16} /> : <IconPlus size={16} />}
            onClick={() => applyAiPlanMutation.mutate()}
            disabled={applyAiPlanMutation.isPending || aiSelectedIds.length === 0}
          >
            {applyAiPlanMutation.isPending ? "Adding..." : `Add ${aiSelectedIds.length} Stories to Sprint`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── JIRA Sync Result ── */}
      <Dialog open={!!syncResult} onClose={() => setSyncResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconRefresh size={20} />
            JIRA Sprint Sync Complete
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {syncResult && (
            <Box>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip label={`${syncResult.fetched} fetched`} variant="outlined" size="small" />
                <Chip label={`${syncResult.created.length} imported`} color="success" size="small" />
                {syncResult.updated.length > 0 && (
                  <Chip label={`${syncResult.updated.length} updated`} color="primary" size="small" />
                )}
                {syncResult.failed.length > 0 && (
                  <Chip label={`${syncResult.failed.length} failed`} color="error" size="small" />
                )}
              </Box>
              {syncResult.created.length === 0 && syncResult.updated.length === 0 && syncResult.failed.length === 0 && (
                <Typography variant="body2" color="textSecondary">All sprints are already up to date.</Typography>
              )}
              {syncResult.created.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" mb={1}>Imported Sprints</Typography>
                  {syncResult.created.map((s) => (
                    <Box key={s.id} display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Chip label={s.status} size="small" variant="outlined" />
                      <Typography variant="body2">{s.name}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {syncResult.failed.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="error" mb={1}>Failed</Typography>
                  {syncResult.failed.map((f) => (
                    <Box key={f.jira_sprint_id} mb={1} p={1} sx={{ border: "1px solid", borderColor: "error.light", borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={600} display="block">{f.name}</Typography>
                      <Typography variant="caption" color="error.main">{f.error}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setSyncResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}

// ── Backlog Group component ───────────────────────────────────────────────────

interface BacklogGroupProps {
  group: BacklogModuleGroup;
  expanded: boolean;
  onToggle: () => void;
  onAddToSprint: (story: StoryResponse) => void;
}

function BacklogGroup({ group, expanded, onToggle, onAddToSprint }: BacklogGroupProps) {
  const modulePoints = group.stories.reduce((sum, s) => sum + (s.story_points ?? 0), 0);

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      {/* Module header */}
      <Box
        display="flex"
        alignItems="center"
        px={2.5}
        py={1.25}
        sx={{
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          bgcolor: "grey.50",
        }}
        onClick={onToggle}
      >
        {expanded ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
        <Box ml={1} display="flex" alignItems="center" gap={1} flexGrow={1}>
          <IconPackage size={15} color="#5D87FF" />
          <Typography variant="subtitle2" fontWeight={600}>
            {group.module_name}
          </Typography>
          {group.jira_epic_key && (
            <Chip
              label={group.jira_epic_key}
              size="small"
              color="secondary"
              variant="outlined"
              icon={<IconTicket size={10} />}
              sx={{ fontSize: "0.6rem", height: 18 }}
            />
          )}
        </Box>
        <Box display="flex" gap={0.75} alignItems="center">
          <Chip label={`${group.stories.length} stories`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
          <Chip label={`${modulePoints} pts`} size="small" color="primary" variant="outlined" sx={{ fontSize: "0.65rem" }} />
        </Box>
      </Box>

      {/* Stories */}
      <Collapse in={expanded}>
        {group.stories.map((story) => (
          <Box
            key={story.id}
            display="flex"
            alignItems="center"
            px={3}
            py={1}
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
              "&:last-child": { borderBottom: "none" },
            }}
          >
            <Box flexGrow={1} mr={1}>
              <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                {story.jira_issue_key && (
                  <Chip
                    label={story.jira_issue_key}
                    size="small"
                    color="info"
                    variant="outlined"
                    icon={<IconTicket size={10} />}
                    sx={{ fontSize: "0.6rem", height: 18 }}
                  />
                )}
                <Typography variant="body2" fontWeight={500}>
                  {story.title}
                </Typography>
              </Box>
              {story.description && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{
                    display: "block",
                    maxWidth: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {story.description}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={0.75} alignItems="center" flexShrink={0}>
              <Chip
                label={story.status.replace("_", " ")}
                color={storyStatusColor(story.status)}
                size="small"
                sx={{ fontSize: "0.6rem", height: 20 }}
              />
              {story.story_points != null && (
                <Chip
                  label={`${story.story_points}pt`}
                  size="small"
                  color={story.story_points <= 3 ? "success" : "warning"}
                  variant="outlined"
                  sx={{ fontSize: "0.6rem", height: 20 }}
                />
              )}
              {assigneeName(story) && (
                <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 90 }}>
                  {assigneeName(story)}
                </Typography>
              )}
              <Tooltip title="Add to sprint">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onAddToSprint(story)}
                >
                  <IconPlus size={15} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </Collapse>
    </Box>
  );
}

// ── Planning sprint stories sub-component ─────────────────────────────────────

function PlanningSprintStories({ projectId, sprintId }: { projectId: string; sprintId: string }) {
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["sprint-stories", projectId, sprintId],
    queryFn: () => getSprintStories(projectId, sprintId),
  });

  const removeMutation = useMutation({
    mutationFn: (storyId: string) =>
      removeStoriesFromSprint(projectId, sprintId, { story_ids: [storyId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint-stories", projectId, sprintId] });
      queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
    },
  });

  if (isLoading) return <CircularProgress size={20} />;
  if (stories.length === 0)
    return (
      <Typography variant="body2" color="textSecondary">
        No stories assigned. Add them from the Backlog below.
      </Typography>
    );

  const totalPoints = stories.reduce((sum, s) => sum + (s.story_points ?? 0), 0);

  return (
    <Box>
      <Box display="flex" gap={1} mb={1}>
        <Chip label={`${stories.length} stories`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
        <Chip label={`${totalPoints} pts`} size="small" color="primary" variant="outlined" sx={{ fontSize: "0.65rem" }} />
      </Box>
      {stories.map((story) => (
        <Box
          key={story.id}
          display="flex"
          alignItems="center"
          px={1}
          py={0.75}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:last-child": { borderBottom: "none" },
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box flexGrow={1} mr={1}>
            <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
              {story.jira_issue_key && (
                <Chip
                  label={story.jira_issue_key}
                  size="small"
                  color="info"
                  variant="outlined"
                  icon={<IconTicket size={10} />}
                  sx={{ fontSize: "0.6rem", height: 18 }}
                />
              )}
              <Typography variant="body2" fontWeight={500}>
                {story.title}
              </Typography>
            </Box>
            {story.description && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  display: "block",
                  maxWidth: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {story.description}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={0.75} alignItems="center" flexShrink={0}>
            <Chip
              label={story.status.replace("_", " ")}
              color={storyStatusColor(story.status)}
              size="small"
              sx={{ fontSize: "0.6rem", height: 20 }}
            />
            {story.story_points != null && (
              <Chip
                label={`${story.story_points}pt`}
                size="small"
                color={story.story_points <= 3 ? "success" : "warning"}
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 20 }}
              />
            )}
            {assigneeName(story) && (
              <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 90 }}>
                {assigneeName(story)}
              </Typography>
            )}
            <Tooltip title="Remove from sprint">
              <IconButton
                size="small"
                color="error"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(story.id)}
              >
                <IconX size={13} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
