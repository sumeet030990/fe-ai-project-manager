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
import { IconExternalLink, IconPencil, IconPlus, IconTicket, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createEpic, deleteEpic, getEpics, updateEpic } from "@/services/epics";
import { getUsers } from "@/services/users";
import { EpicCreate, EpicResponse, EpicStatus, EpicUpdate } from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const EPIC_STATUSES: EpicStatus[] = ["draft", "ready", "in_progress", "done"];

const epicStatusColor = (s: string): "default" | "info" | "warning" | "success" => {
  if (s === "ready") return "info";
  if (s === "in_progress") return "warning";
  if (s === "done") return "success";
  return "default";
};

export default function EpicsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<EpicResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EpicResponse | null>(null);
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const [epicData, setEpicData] = useState({
    name: "",
    description: "",
    order: 0,
    status: "draft" as EpicStatus,
    priority: 0,
    created_by: "",
  });

  const { data: epicsData, isLoading } = useQuery({
    queryKey: ["epics", projectId, page],
    queryFn: () => getEpics(projectId, page + 1, rowsPerPage),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: formOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: EpicCreate) => createEpic(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
      setFormOpen(false);
      toast("Epic created", "success");
    },
    onError: () => toast("Failed to create epic", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EpicUpdate }) =>
      updateEpic(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
      setFormOpen(false);
      setEditingEpic(null);
      toast("Epic updated", "success");
    },
    onError: () => toast("Failed to update epic", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEpic(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
      setDeleteTarget(null);
      toast("Epic deleted", "success");
    },
    onError: () => toast("Failed to delete epic", "error"),
  });

  const openAdd = () => {
    setEditingEpic(null);
    setEpicData({ name: "", description: "", order: 0, status: "draft", priority: 0, created_by: "" });
    setFormOpen(true);
  };

  const openEdit = (epic: EpicResponse) => {
    setEditingEpic(epic);
    setEpicData({
      name: epic.name,
      description: epic.description ?? "",
      order: epic.order,
      status: epic.status,
      priority: epic.priority,
      created_by: epic.created_by,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!epicData.name.trim()) return;
    if (editingEpic) {
      updateMutation.mutate({
        id: editingEpic.id,
        payload: {
          name: epicData.name,
          description: epicData.description || undefined,
          order: epicData.order,
          status: epicData.status,
          priority: epicData.priority,
        },
      });
    } else {
      if (!epicData.created_by) return;
      createMutation.mutate({
        name: epicData.name,
        description: epicData.description || undefined,
        order: epicData.order,
        status: epicData.status,
        priority: epicData.priority,
        created_by: epicData.created_by,
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
          Add Epic
        </Button>
      </Box>

      {epicsData?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No epics yet. Add one to get started.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {epicsData?.items.map((epic) => (
            <Grid key={epic.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {epic.name}
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                      <Chip label={`P${epic.priority}`} size="small" variant="outlined" />
                      <Chip
                        label={epic.status.replace("_", " ")}
                        color={epicStatusColor(epic.status)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  {epic.description && (
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      {epic.description}
                    </Typography>
                  )}
                  {epic.jira_epic_key && (
                    <Chip
                      label={epic.jira_epic_key}
                      size="small"
                      variant="outlined"
                      color="info"
                      icon={<IconTicket size={12} />}
                      sx={{ mb: 1 }}
                    />
                  )}
                  <Typography variant="caption" color="textSecondary">
                    Order: {epic.order}
                  </Typography>
                </CardContent>
                <Box display="flex" justifyContent="flex-end" gap={0.5} px={1} pb={1}>
                  <IconButton
                    size="small"
                    color="info"
                    title="View features"
                    onClick={() => router.push(`/projects/${projectId}/epics/${epic.id}`)}
                  >
                    <IconExternalLink size={16} />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={() => openEdit(epic)}>
                    <IconPencil size={16} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(epic)}>
                    <IconTrash size={16} />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {(epicsData?.total ?? 0) > rowsPerPage && (
        <TablePagination
          component="div"
          count={epicsData?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={() => {}}
          rowsPerPageOptions={[20]}
        />
      )}

      {/* Epic Form */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEpic ? "Edit Epic" : "Add Epic"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                label="Epic Name"
                fullWidth
                required
                value={epicData.name}
                onChange={(e) => setEpicData((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={epicData.description}
                onChange={(e) => setEpicData((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={epicData.status}
                  label="Status"
                  onChange={(e) =>
                    setEpicData((p) => ({ ...p, status: e.target.value as EpicStatus }))
                  }
                >
                  {EPIC_STATUSES.map((s) => (
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
                value={epicData.priority}
                onChange={(e) =>
                  setEpicData((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Order"
                type="number"
                fullWidth
                value={epicData.order}
                onChange={(e) =>
                  setEpicData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            {!editingEpic && (
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Created By</InputLabel>
                  <Select
                    value={epicData.created_by}
                    label="Created By"
                    onChange={(e) => setEpicData((p) => ({ ...p, created_by: e.target.value }))}
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
              : editingEpic
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Epic */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Epic</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? All features and stories inside this epic
            will also be removed.
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
