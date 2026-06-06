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
  Typography,
} from "@mui/material";
import { IconExternalLink, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createFeature, deleteFeature, getFeatures, updateFeature } from "@/services/features";
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

export default function FeaturesTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [formOpen, setFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureResponse | null>(null);
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
  });

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ["features", projectId, page],
    queryFn: () => getFeatures(projectId, page + 1, rowsPerPage),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: formOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: FeatureCreate) => createFeature(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      setFormOpen(false);
      toast("Feature created", "success");
    },
    onError: () => toast("Failed to create feature", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FeatureUpdate }) =>
      updateFeature(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      setFormOpen(false);
      setEditingFeature(null);
      toast("Feature updated", "success");
    },
    onError: () => toast("Failed to update feature", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteRemote }: { id: string; deleteRemote: boolean }) =>
      deleteFeature(projectId, id, deleteRemote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      setDeleteTarget(null);
      toast("Feature deleted", "success");
    },
    onError: () => toast("Failed to delete feature", "error"),
  });

  const openAdd = () => {
    setEditingFeature(null);
    setFeatureData({ name: "", description: "", order: 0, status: "draft", priority: 0, created_by: "" });
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

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openAdd}>
          Add Feature
        </Button>
      </Box>

      {featuresData?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No features yet. Add one to get started.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {featuresData?.items.map((feat) => (
            <Grid key={feat.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {feat.name}
                    </Typography>
                    <Box display="flex" gap={0.5}>
                      <Chip
                        label={`P${feat.priority}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={feat.status.replace("_", " ")}
                        color={featureStatusColor(feat.status)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  {feat.description && (
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      {feat.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="textSecondary">
                    Order: {feat.order}
                  </Typography>
                </CardContent>
                <Box display="flex" justifyContent="flex-end" gap={0.5} px={1} pb={1}>
                  <IconButton
                    size="small"
                    color="info"
                    title="View stories"
                    onClick={() => router.push(`/projects/${projectId}/features/${feat.id}`)}
                  >
                    <IconExternalLink size={16} />
                  </IconButton>
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
    </>
  );
}
