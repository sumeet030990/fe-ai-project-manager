"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconArrowLeft,
  IconExternalLink,
  IconPencil,
  IconPlus,
  IconRobot,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import { getEpic } from "@/services/epics";
import {
  createFeature,
  deleteFeature,
  generateFeatures,
  getFeatures,
  refineFeature,
  updateFeature,
} from "@/services/features";
import { getProject } from "@/services/projects";
import { getUsers } from "@/services/users";
import { FeatureCreate, FeatureResponse, FeatureStatus, FeatureUpdate } from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const FEATURE_STATUSES: FeatureStatus[] = ["draft", "ready", "in_progress", "done"];

const featureStatusColor = (s: string): "default" | "info" | "warning" | "success" => {
  if (s === "ready") return "info";
  if (s === "in_progress") return "warning";
  if (s === "done") return "success";
  return "default";
};

export default function EpicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const epicId = params.epicId as string;

  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [formOpen, setFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureResponse | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateContext, setGenerateContext] = useState("");
  const [generateConfigId, setGenerateConfigId] = useState("");
  const [refineTarget, setRefineTarget] = useState<FeatureResponse | null>(null);
  const [refineContext, setRefineContext] = useState("");
  const [refineConfigId, setRefineConfigId] = useState("");
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const [featureData, setFeatureData] = useState({
    name: "",
    description: "",
    order: 0,
    status: "draft" as FeatureStatus,
    priority: 0,
    created_by: "",
    business_rules: "",
    acceptance_criteria: "",
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: epic, isLoading: epicLoading } = useQuery({
    queryKey: ["epic", projectId, epicId],
    queryFn: () => getEpic(projectId, epicId),
    enabled: !!projectId && !!epicId,
  });

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", epicId, page],
    queryFn: () => getFeatures(epicId, page + 1, rowsPerPage),
    enabled: !!epicId,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: formOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: FeatureCreate) => createFeature(epicId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", epicId] });
      setFormOpen(false);
      toast("Feature created", "success");
    },
    onError: () => toast("Failed to create feature", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FeatureUpdate }) =>
      updateFeature(epicId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", epicId] });
      setFormOpen(false);
      setEditingFeature(null);
      toast("Feature updated", "success");
    },
    onError: () => toast("Failed to update feature", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteRemote }: { id: string; deleteRemote: boolean }) =>
      deleteFeature(epicId, id, deleteRemote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", epicId] });
      setDeleteTarget(null);
      toast("Feature deleted", "success");
    },
    onError: () => toast("Failed to delete feature", "error"),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateFeatures(epicId, {
        context: generateContext || undefined,
        config_id: generateConfigId || undefined,
      }),
    onSuccess: (newFeatures) => {
      queryClient.invalidateQueries({ queryKey: ["features", epicId] });
      setGenerateOpen(false);
      setGenerateContext("");
      setGenerateConfigId("");
      toast(
        `Generated ${newFeatures.length} feature${newFeatures.length !== 1 ? "s" : ""} successfully`,
        "success"
      );
    },
    onError: () => toast("Failed to generate features", "error"),
  });

  const refineMutation = useMutation({
    mutationFn: () =>
      refineFeature(epicId, refineTarget!.id, {
        context: refineContext || undefined,
        config_id: refineConfigId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", epicId] });
      setRefineTarget(null);
      setRefineContext("");
      setRefineConfigId("");
      toast("Feature refined successfully", "success");
    },
    onError: () => toast("Failed to refine feature", "error"),
  });

  const openAdd = () => {
    setEditingFeature(null);
    setFeatureData({ name: "", description: "", order: 0, status: "draft", priority: 0, created_by: "", business_rules: "", acceptance_criteria: "" });
    setFormOpen(true);
  };

  const openEdit = (feat: FeatureResponse) => {
    setEditingFeature(feat);
    setFeatureData({
      name: feat.name,
      description: feat.description ?? "",
      order: feat.order,
      status: feat.status,
      priority: feat.priority,
      created_by: feat.created_by,
      business_rules: feat.business_rules ?? "",
      acceptance_criteria: feat.acceptance_criteria ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!featureData.name.trim()) return;
    if (editingFeature) {
      updateMutation.mutate({
        id: editingFeature.id,
        payload: {
          name: featureData.name,
          description: featureData.description || undefined,
          order: featureData.order,
          status: featureData.status,
          priority: featureData.priority,
          business_rules: featureData.business_rules || undefined,
          acceptance_criteria: featureData.acceptance_criteria || undefined,
        },
      });
    } else {
      if (!featureData.created_by) return;
      createMutation.mutate({
        name: featureData.name,
        description: featureData.description || undefined,
        order: featureData.order,
        status: featureData.status,
        priority: featureData.priority,
        created_by: featureData.created_by,
      });
    }
  };

  const isLoading = epicLoading || featuresLoading;

  return (
    <PageContainer title={epic?.name ?? "Epic"} description={epic?.description ?? ""}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => router.push(`/projects/${projectId}`)} size="small">
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="caption" color="textSecondary">
            {project?.name} / Epics
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {epic?.name ?? "..."}
          </Typography>
          {epic?.description && (
            <Typography variant="body2" color="textSecondary">
              {epic.description}
            </Typography>
          )}
        </Box>
        {epic && (
          <Chip
            label={epic.status.replace("_", " ")}
            color={featureStatusColor(epic.status)}
            size="small"
          />
        )}
      </Box>

      {/* Actions */}
      <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
        <Tooltip title="AI: Generate features from epic context">
          <Button
            variant="outlined"
            startIcon={
              generateMutation.isPending ? (
                <CircularProgress size={16} />
              ) : (
                <IconRobot size={16} />
              )
            }
            onClick={() => setGenerateOpen(true)}
            disabled={generateMutation.isPending}
            color="secondary"
          >
            AI Generate Features
          </Button>
        </Tooltip>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openAdd}>
          Add Feature
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : featuresData?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No features yet. Add one to get started.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {featuresData?.items.map((feat) => (
            <Grid key={feat.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {feat.name}
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                      <Chip label={`P${feat.priority}`} size="small" variant="outlined" />
                      <Chip
                        label={feat.status.replace("_", " ")}
                        color={featureStatusColor(feat.status)}
                        size="small"
                      />
                      {feat.is_ai_generated && (
                        <Chip
                          label="AI"
                          icon={<IconRobot size={12} />}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                  {feat.description && (
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      {feat.description}
                    </Typography>
                  )}
                  {feat.acceptance_criteria && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        mb: 0.5,
                      }}
                    >
                      AC: {feat.acceptance_criteria}
                    </Typography>
                  )}
                  <Typography variant="caption" color="textSecondary">
                    Order: {feat.order}
                  </Typography>
                </CardContent>
                <Box display="flex" justifyContent="flex-end" gap={0.5} px={1} pb={1}>
                  <Tooltip title="View stories">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() =>
                        router.push(`/projects/${projectId}/epics/${epicId}/features/${feat.id}`)
                      }
                    >
                      <IconExternalLink size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="AI Refine feature">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => {
                        setRefineTarget(feat);
                        setRefineContext("");
                        setRefineConfigId("");
                      }}
                    >
                      <IconSparkles size={16} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" color="primary" onClick={() => openEdit(feat)}>
                    <IconPencil size={16} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(feat)}>
                    <IconTrash size={16} />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {(featuresData?.total ?? 0) > rowsPerPage && (
        <TablePagination
          component="div"
          count={featuresData?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={() => {}}
          rowsPerPageOptions={[20]}
        />
      )}

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconRobot size={20} /> AI Generate Features
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            AI will generate features based on the epic&apos;s name, description, and project context.
          </Typography>
          <Box mb={2}>
            <AIModelSelector projectId={projectId} value={generateConfigId} onChange={setGenerateConfigId} />
          </Box>
          <TextField
            label="Additional Context (optional)"
            fullWidth
            multiline
            rows={4}
            value={generateContext}
            onChange={(e) => setGenerateContext(e.target.value)}
            placeholder="e.g. Focus on mobile-first flows, include admin management features..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={generateMutation.isPending ? <CircularProgress size={16} /> : <IconRobot size={16} />}
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Features"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Refine Dialog */}
      <Dialog open={!!refineTarget} onClose={() => setRefineTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconSparkles size={20} /> AI Refine Feature
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>{refineTarget?.name}</Typography>
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
            {refineTarget?.acceptance_criteria && (
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>Acceptance Criteria</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{refineTarget.acceptance_criteria}</Typography>
              </Box>
            )}
            {!refineTarget?.description && !refineTarget?.business_rules && !refineTarget?.acceptance_criteria && (
              <Typography variant="body2" color="textSecondary" fontStyle="italic">
                No details yet — AI will generate them from scratch.
              </Typography>
            )}
          </Paper>
          <Box mb={2}>
            <AIModelSelector projectId={projectId} value={refineConfigId} onChange={setRefineConfigId} />
          </Box>
          <TextField
            label="Additional Context (optional)"
            fullWidth
            multiline
            rows={3}
            value={refineContext}
            onChange={(e) => setRefineContext(e.target.value)}
            placeholder="e.g. This feature must comply with GDPR, focus on enterprise use cases..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRefineTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={refineMutation.isPending ? <CircularProgress size={16} /> : <IconSparkles size={16} />}
            onClick={() => refineMutation.mutate()}
            disabled={refineMutation.isPending || !refineTarget}
          >
            {refineMutation.isPending ? "Refining..." : "Refine Feature"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature Form */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFeature ? "Edit Feature" : "Add Feature"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                label="Feature Name"
                fullWidth
                required
                value={featureData.name}
                onChange={(e) => setFeatureData((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={featureData.description}
                onChange={(e) => setFeatureData((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={featureData.status}
                  label="Status"
                  onChange={(e) =>
                    setFeatureData((p) => ({ ...p, status: e.target.value as FeatureStatus }))
                  }
                >
                  {FEATURE_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Priority"
                type="number"
                fullWidth
                value={featureData.priority}
                onChange={(e) =>
                  setFeatureData((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Order"
                type="number"
                fullWidth
                value={featureData.order}
                onChange={(e) =>
                  setFeatureData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            {!editingFeature && (
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Created By</InputLabel>
                  <Select
                    value={featureData.created_by}
                    label="Created By"
                    onChange={(e) => setFeatureData((p) => ({ ...p, created_by: e.target.value }))}
                  >
                    {usersData?.items.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {editingFeature && (
              <>
                <Grid size={12}>
                  <Divider>
                    <Typography variant="caption" color="textSecondary">AI-Enriched Fields</Typography>
                  </Divider>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Business Rules"
                    fullWidth
                    multiline
                    rows={3}
                    value={featureData.business_rules}
                    onChange={(e) => setFeatureData((p) => ({ ...p, business_rules: e.target.value }))}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Acceptance Criteria"
                    fullWidth
                    multiline
                    rows={3}
                    value={featureData.acceptance_criteria}
                    onChange={(e) => setFeatureData((p) => ({ ...p, acceptance_criteria: e.target.value }))}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : editingFeature
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Feature */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Feature</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? All associated stories will also be
            removed.
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            Choose whether to also delete linked JIRA issues for all stories in this feature.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="outlined"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, deleteRemote: false })
            }
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Locally"}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteTarget && deleteMutation.mutate({ id: deleteTarget.id, deleteRemote: true })
            }
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Locally + JIRA"}
          </Button>
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
