"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCloudDownload,
  IconCloudUpload,
  IconListCheck,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSparkles,
  IconTicket,
  IconTrash,
  IconUnlink,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import { getEpic } from "@/services/epics";
import { getFeature } from "@/services/features";
import { getProject } from "@/services/projects";
import {
  createStory,
  deleteStory,
  generateStories,
  getStories,
  refineStory,
  updateStory,
} from "@/services/stories";
import {
  createStoryInJira,
  deleteStoryFromJira,
  pullStoryFromJira,
  syncStoriesFromJira,
  updateStoryInJira,
} from "@/services/jira";
import {
  JiraSyncResult,
  StoryCreate,
  StoryResponse,
  StoryStatus,
  StoryUpdate,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const STORY_STATUSES: StoryStatus[] = [
  "draft", "review", "approved", "rejected", "in_progress", "done",
];

const storyStatusColor = (
  s: string
): "default" | "info" | "success" | "error" | "warning" | "primary" => {
  if (s === "review") return "info";
  if (s === "approved") return "success";
  if (s === "rejected") return "error";
  if (s === "in_progress") return "warning";
  if (s === "done") return "primary";
  return "default";
};

const STORY_POINTS_OPTIONS = [1, 2, 3, 5, 8, 13];

const emptyStoryForm = {
  title: "",
  description: "",
  order: 0,
  status: "draft" as StoryStatus,
  priority: 0,
  story_points: 3 as number | "",
  business_rules: "",
  acceptance_criteria: "",
  file_references: "",
  urls: "",
};

type StoryForm = typeof emptyStoryForm;

export default function FeatureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const epicId = params.epicId as string;
  const featureId = params.featureId as string;

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoryResponse | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateContext, setGenerateContext] = useState("");
  const [generateConfigId, setGenerateConfigId] = useState("");
  const [refineTarget, setRefineTarget] = useState<StoryResponse | null>(null);
  const [refineContext, setRefineContext] = useState("");
  const [refineConfigId, setRefineConfigId] = useState("");
  const [storyForm, setStoryForm] = useState<StoryForm>(emptyStoryForm);
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const [jiraActionId, setJiraActionId] = useState<string | null>(null);
  const [jiraPullId, setJiraPullId] = useState<string | null>(null);
  const [jiraDeleteTarget, setJiraDeleteTarget] = useState<StoryResponse | null>(null);
  const [syncResult, setSyncResult] = useState<JiraSyncResult | null>(null);

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: epic } = useQuery({
    queryKey: ["epic", projectId, epicId],
    queryFn: () => getEpic(projectId, epicId),
    enabled: !!projectId && !!epicId,
  });

  const { data: feature, isLoading: featureLoading } = useQuery({
    queryKey: ["feature", epicId, featureId],
    queryFn: () => getFeature(epicId, featureId),
    enabled: !!epicId && !!featureId,
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ["stories", featureId, page],
    queryFn: () => getStories(featureId, page + 1, rowsPerPage),
    enabled: !!featureId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: StoryCreate) => createStory(featureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setFormOpen(false);
      toast("Story created", "success");
    },
    onError: () => toast("Failed to create story", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StoryUpdate }) =>
      updateStory(featureId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setFormOpen(false);
      setEditingStory(null);
      toast("Story updated", "success");
    },
    onError: () => toast("Failed to update story", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteRemote }: { id: string; deleteRemote: boolean }) =>
      deleteStory(featureId, id, deleteRemote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setDeleteTarget(null);
      toast("Story deleted", "success");
    },
    onError: () => toast("Failed to delete story", "error"),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateStories(featureId, {
        context: generateContext || undefined,
        config_id: generateConfigId || undefined,
      }),
    onSuccess: (newStories) => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setGenerateOpen(false);
      setGenerateContext("");
      setGenerateConfigId("");
      toast(
        `Generated ${newStories.length} story${newStories.length !== 1 ? "s" : ""} successfully`,
        "success"
      );
    },
    onError: () => toast("Failed to generate stories", "error"),
  });

  const refineMutation = useMutation({
    mutationFn: () =>
      refineStory(featureId, refineTarget!.id, {
        context: refineContext || undefined,
        config_id: refineConfigId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setRefineTarget(null);
      setRefineContext("");
      setRefineConfigId("");
      toast("Story refined successfully", "success");
    },
    onError: () => toast("Failed to refine story", "error"),
  });

  const jiraSyncMutation = useMutation({
    mutationFn: () => syncStoriesFromJira(featureId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setSyncResult(result);
    },
    onError: () => toast("Failed to sync from JIRA", "error"),
  });

  const jiraPullMutation = useMutation({
    mutationFn: (storyId: string) => pullStoryFromJira(featureId, storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setJiraPullId(null);
      toast("Story refreshed from JIRA", "success");
    },
    onError: () => { setJiraPullId(null); toast("Failed to pull from JIRA", "error"); },
  });

  const jiraCreateMutation = useMutation({
    mutationFn: (storyId: string) => createStoryInJira(featureId, storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setJiraActionId(null);
      toast("Story pushed to JIRA", "success");
    },
    onError: () => { setJiraActionId(null); toast("Failed to push story to JIRA", "error"); },
  });

  const jiraUpdateMutation = useMutation({
    mutationFn: (storyId: string) => updateStoryInJira(featureId, storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setJiraActionId(null);
      toast("JIRA issue updated", "success");
    },
    onError: () => { setJiraActionId(null); toast("Failed to update JIRA issue", "error"); },
  });

  const jiraDeleteMutation = useMutation({
    mutationFn: (storyId: string) => deleteStoryFromJira(featureId, storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", featureId] });
      setJiraDeleteTarget(null);
      toast("JIRA issue deleted and story unlinked", "success");
    },
    onError: () => toast("Failed to delete JIRA issue", "error"),
  });

  const openAdd = () => {
    setEditingStory(null);
    setStoryForm(emptyStoryForm);
    setFormOpen(true);
  };

  const openEdit = (story: StoryResponse) => {
    setEditingStory(story);
    setStoryForm({
      title: story.title,
      description: story.description ?? "",
      order: story.order,
      status: story.status,
      priority: story.priority,
      story_points: story.story_points ?? "",
      business_rules: story.business_rules ?? "",
      acceptance_criteria: story.acceptance_criteria ?? "",
      file_references: story.file_references ?? "",
      urls: story.urls ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!storyForm.title.trim()) return;
    if (editingStory) {
      updateMutation.mutate({
        id: editingStory.id,
        payload: {
          title: storyForm.title,
          description: storyForm.description || undefined,
          order: storyForm.order,
          status: storyForm.status,
          priority: storyForm.priority,
          story_points: storyForm.story_points !== "" ? storyForm.story_points : undefined,
          business_rules: storyForm.business_rules || undefined,
          acceptance_criteria: storyForm.acceptance_criteria || undefined,
          file_references: storyForm.file_references || undefined,
          urls: storyForm.urls || undefined,
        },
      });
    } else {
      createMutation.mutate({
        title: storyForm.title,
        description: storyForm.description || undefined,
        order: storyForm.order,
        status: storyForm.status,
        priority: storyForm.priority,
        story_points: storyForm.story_points !== "" ? storyForm.story_points : undefined,
      });
    }
  };

  const isLoading = featureLoading || storiesLoading;

  return (
    <PageContainer
      title={feature?.name ?? "Feature"}
      description={feature?.description ?? ""}
    >
      {/* Breadcrumb Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton
          onClick={() => router.push(`/projects/${projectId}/epics/${epicId}`)}
          size="small"
        >
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="caption" color="textSecondary">
            {project?.name} / Epics / {epic?.name} / Features
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {feature?.name ?? "..."}
          </Typography>
          {feature?.description && (
            <Typography variant="body2" color="textSecondary">
              {feature.description}
            </Typography>
          )}
        </Box>
        {feature && (
          <Chip
            label={feature.status.replace("_", " ")}
            color={
              feature.status === "done"
                ? "success"
                : feature.status === "in_progress"
                ? "warning"
                : feature.status === "ready"
                ? "info"
                : "default"
            }
            size="small"
          />
        )}
      </Box>

      {/* Actions */}
      <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
        <Tooltip title="Fetch new stories from JIRA that are not yet in the system">
          <Button
            variant="outlined"
            startIcon={jiraSyncMutation.isPending ? <CircularProgress size={16} /> : <IconCloudDownload size={16} />}
            onClick={() => jiraSyncMutation.mutate()}
            disabled={jiraSyncMutation.isPending}
            color="info"
          >
            Sync from JIRA
          </Button>
        </Tooltip>
        <Tooltip title="AI: Generate stories from project info and feature context">
          <Button
            variant="outlined"
            startIcon={<IconRobot size={16} />}
            onClick={() => setGenerateOpen(true)}
            color="secondary"
          >
            AI Generate Stories
          </Button>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={openAdd}
        >
          Add Story
        </Button>
      </Box>

      {/* Stories Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }}><Typography variant="subtitle2">#</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2">Title</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2">Status</Typography></TableCell>
                  <TableCell sx={{ width: 90 }}><Typography variant="subtitle2">Priority</Typography></TableCell>
                  <TableCell sx={{ width: 80 }}><Typography variant="subtitle2">Points</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2">Assignee</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2">AI</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2">JIRA</Typography></TableCell>
                  <TableCell align="right"><Typography variant="subtitle2">Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {storiesData?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="textSecondary" py={2}>
                        No stories yet. Add one manually or use AI generation.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  storiesData?.items.map((story, idx) => (
                    <TableRow key={story.id} hover>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">{story.order || idx + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{story.title}</Typography>
                        {story.description && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: "block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {story.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={story.status.replace("_", " ")} color={storyStatusColor(story.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={`P${story.priority}`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {story.story_points != null ? (
                          <Chip
                            label={`${story.story_points} pt${story.story_points !== 1 ? "s" : ""}`}
                            size="small"
                            variant="outlined"
                            color={story.story_points <= 3 ? "success" : "warning"}
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {story.assignee ? (
                          <Typography variant="caption" noWrap>
                            {[story.assignee.first_name, story.assignee.last_name].filter(Boolean).join(" ") || story.assignee.email}
                          </Typography>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {story.is_ai_generated && (
                          <Chip label="AI" icon={<IconRobot size={12} />} size="small" color="secondary" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {story.jira_issue_key ? (
                          <Chip label={story.jira_issue_key} size="small" variant="outlined" color="info" icon={<IconTicket size={12} />} />
                        ) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Test Cases">
                          <IconButton
                            size="small"
                            color="inherit"
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}/epics/${epicId}/features/${featureId}/stories/${story.id}/test-cases`
                              )
                            }
                          >
                            <IconListCheck size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="AI Refine story">
                          <IconButton size="small" color="secondary" onClick={() => { setRefineTarget(story); setRefineContext(""); }}>
                            <IconSparkles size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={story.jira_issue_key ? "Update in JIRA" : "Push to JIRA"}>
                          <IconButton
                            size="small"
                            color={story.jira_issue_key ? "info" : "success"}
                            disabled={jiraActionId === story.id}
                            onClick={() => {
                              setJiraActionId(story.id);
                              if (story.jira_issue_key) {
                                jiraUpdateMutation.mutate(story.id);
                              } else {
                                jiraCreateMutation.mutate(story.id);
                              }
                            }}
                          >
                            {jiraActionId === story.id ? <CircularProgress size={14} /> : <IconCloudUpload size={16} />}
                          </IconButton>
                        </Tooltip>
                        {story.jira_issue_key && (
                          <Tooltip title="Pull latest data from JIRA">
                            <IconButton
                              size="small"
                              color="info"
                              disabled={jiraPullId === story.id}
                              onClick={() => { setJiraPullId(story.id); jiraPullMutation.mutate(story.id); }}
                            >
                              {jiraPullId === story.id ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {story.jira_issue_key && (
                          <Tooltip title="Delete from JIRA">
                            <IconButton size="small" color="warning" onClick={() => setJiraDeleteTarget(story)}>
                              <IconUnlink size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" color="primary" onClick={() => openEdit(story)}>
                          <IconPencil size={16} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(story)}>
                          <IconTrash size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {(storiesData?.total ?? 0) > rowsPerPage && (
            <TablePagination
              component="div"
              count={storiesData?.total ?? 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={() => {}}
              rowsPerPageOptions={[20]}
            />
          )}
        </>
      )}

      {/* Story Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingStory ? "Edit Story" : "Add Story"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField label="Title" fullWidth required value={storyForm.title}
                onChange={(e) => setStoryForm((p) => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid size={12}>
              <TextField label="Description" fullWidth multiline rows={3} value={storyForm.description}
                onChange={(e) => setStoryForm((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={storyForm.status} label="Status"
                  onChange={(e) => setStoryForm((p) => ({ ...p, status: e.target.value as StoryStatus }))}>
                  {STORY_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Priority" type="number" fullWidth value={storyForm.priority}
                onChange={(e) => setStoryForm((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Story Points</InputLabel>
                <Select value={storyForm.story_points} label="Story Points"
                  onChange={(e) => setStoryForm((p) => ({ ...p, story_points: e.target.value as number | "" }))}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {STORY_POINTS_OPTIONS.map((pt) => (
                    <MenuItem key={pt} value={pt}>{pt} {pt === 1 ? "pt" : "pts"}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Order" type="number" fullWidth value={storyForm.order}
                onChange={(e) => setStoryForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
            </Grid>
            {editingStory && (
              <>
                <Grid size={12}>
                  <Divider><Typography variant="caption" color="textSecondary">AI-Enriched Fields</Typography></Divider>
                </Grid>
                <Grid size={12}>
                  <TextField label="Business Rules" fullWidth multiline rows={3} value={storyForm.business_rules}
                    onChange={(e) => setStoryForm((p) => ({ ...p, business_rules: e.target.value }))} />
                </Grid>
                <Grid size={12}>
                  <TextField label="Acceptance Criteria" fullWidth multiline rows={3} value={storyForm.acceptance_criteria}
                    onChange={(e) => setStoryForm((p) => ({ ...p, acceptance_criteria: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="File References" fullWidth multiline rows={2} value={storyForm.file_references}
                    onChange={(e) => setStoryForm((p) => ({ ...p, file_references: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="URLs" fullWidth multiline rows={2} value={storyForm.urls}
                    onChange={(e) => setStoryForm((p) => ({ ...p, urls: e.target.value }))} />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingStory ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}><IconRobot size={20} /> AI Generate Stories</Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            AI will generate user stories based on the project info, tech stack, and this feature&apos;s context.
          </Typography>
          <Box mb={2}>
            <AIModelSelector projectId={projectId} value={generateConfigId} onChange={setGenerateConfigId} />
          </Box>
          <TextField
            label="Additional Context (optional)" fullWidth multiline rows={4}
            value={generateContext} onChange={(e) => setGenerateContext(e.target.value)}
            placeholder="e.g. Focus on authentication flows, include edge cases for mobile users..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary"
            startIcon={generateMutation.isPending ? <CircularProgress size={16} /> : <IconRobot size={16} />}
            onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Generating..." : "Generate Stories"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Refine Dialog */}
      <Dialog open={!!refineTarget} onClose={() => setRefineTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}><IconSparkles size={20} /> AI Refine Story</Box>
        </DialogTitle>
        <DialogContent dividers>
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>{refineTarget?.title}</Typography>
            {refineTarget?.description && (
              <Box mb={1.5}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>Description</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{refineTarget.description}</Typography>
              </Box>
            )}
            {refineTarget?.business_rules && (
              <Box mb={1.5}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>Business Rules</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{refineTarget.business_rules}</Typography>
              </Box>
            )}
            {!refineTarget?.description && !refineTarget?.business_rules && (
              <Typography variant="body2" color="textSecondary" fontStyle="italic">
                No details yet — AI will generate them from scratch.
              </Typography>
            )}
          </Paper>
          <Box mb={2}>
            <AIModelSelector projectId={projectId} value={refineConfigId} onChange={setRefineConfigId} />
          </Box>
          <TextField
            label="Additional Context (optional)" fullWidth multiline rows={3}
            value={refineContext} onChange={(e) => setRefineContext(e.target.value)}
            placeholder="e.g. This is a payment flow, PCI compliance required..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRefineTarget(null)}>Cancel</Button>
          <Button variant="contained" color="secondary"
            startIcon={refineMutation.isPending ? <CircularProgress size={16} /> : <IconSparkles size={16} />}
            onClick={() => refineMutation.mutate()} disabled={refineMutation.isPending || !refineTarget}>
            {refineMutation.isPending ? "Refining..." : "Refine Story"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Story</DialogTitle>
        <DialogContent>
          <Typography>Delete story <strong>&quot;{deleteTarget?.title}&quot;</strong>? This action cannot be undone.</Typography>
          {deleteTarget?.jira_issue_key && (
            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              This story is linked to JIRA issue <strong>{deleteTarget.jira_issue_key}</strong>.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="outlined" color="error" disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, deleteRemote: false })}>
            {deleteMutation.isPending ? "Deleting..." : "Delete Locally"}
          </Button>
          <Button variant="contained" color="error" disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, deleteRemote: true })}>
            {deleteMutation.isPending ? "Deleting..." : "Delete Locally + JIRA"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* JIRA Sync Result Dialog */}
      <Dialog open={!!syncResult} onClose={() => setSyncResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}><IconCloudDownload size={20} /> JIRA Sync Complete</Box>
        </DialogTitle>
        <DialogContent dividers>
          {syncResult && (
            <Box>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip label={`${syncResult.fetched} fetched`} variant="outlined" size="small" />
                <Chip label={`${syncResult.imported.length} imported`} color="success" size="small" />
                {syncResult.updated.length > 0 && <Chip label={`${syncResult.updated.length} updated`} color="primary" size="small" />}
                {syncResult.failed.length > 0 && <Chip label={`${syncResult.failed.length} failed`} color="error" size="small" />}
              </Box>
              {syncResult.imported.length === 0 && syncResult.updated.length === 0 && (
                <Typography variant="body2" color="textSecondary">All JIRA issues are already up to date.</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setSyncResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* JIRA Delete Confirmation */}
      <Dialog open={!!jiraDeleteTarget} onClose={() => setJiraDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete from JIRA</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete JIRA issue <strong>{jiraDeleteTarget?.jira_issue_key}</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            The local story will be kept but unlinked from JIRA.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setJiraDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={jiraDeleteMutation.isPending}
            onClick={() => jiraDeleteTarget && jiraDeleteMutation.mutate(jiraDeleteTarget.id)}>
            {jiraDeleteMutation.isPending ? "Deleting..." : "Delete from JIRA"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
