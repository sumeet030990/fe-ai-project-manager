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
import { createModule, deleteModule, getModules, updateModule } from "@/services/modules";
import { getUsers } from "@/services/users";
import { ModuleCreate, ModuleResponse, ModuleStatus, ModuleUpdate } from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const MODULE_STATUSES: ModuleStatus[] = ["draft", "ready", "in_progress", "done"];

const moduleStatusColor = (s: string): "default" | "info" | "warning" | "success" => {
  if (s === "ready") return "info";
  if (s === "in_progress") return "warning";
  if (s === "done") return "success";
  return "default";
};

export default function ModulesTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;
  const [formOpen, setFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModuleResponse | null>(null);
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const [moduleData, setModuleData] = useState({
    name: "",
    description: "",
    order: 0,
    status: "draft" as ModuleStatus,
    created_by: "",
  });

  const { data: modulesData, isLoading } = useQuery({
    queryKey: ["modules", projectId, page],
    queryFn: () => getModules(projectId, page + 1, rowsPerPage),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: formOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ModuleCreate) => createModule(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
      setFormOpen(false);
      toast("Module created", "success");
    },
    onError: () => toast("Failed to create module", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModuleUpdate }) =>
      updateModule(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
      setFormOpen(false);
      setEditingModule(null);
      toast("Module updated", "success");
    },
    onError: () => toast("Failed to update module", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteRemote }: { id: string; deleteRemote: boolean }) =>
      deleteModule(projectId, id, deleteRemote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", projectId] });
      setDeleteTarget(null);
      toast("Module deleted", "success");
    },
    onError: () => toast("Failed to delete module", "error"),
  });

  const openAdd = () => {
    setEditingModule(null);
    setModuleData({ name: "", description: "", order: 0, status: "draft", created_by: "" });
    setFormOpen(true);
  };

  const openEdit = (mod: ModuleResponse) => {
    setEditingModule(mod);
    setModuleData({
      name: mod.name,
      description: mod.description ?? "",
      order: mod.order,
      status: mod.status,
      created_by: mod.created_by,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!moduleData.name.trim()) return;
    if (editingModule) {
      updateMutation.mutate({
        id: editingModule.id,
        payload: {
          name: moduleData.name,
          description: moduleData.description || undefined,
          order: moduleData.order,
          status: moduleData.status,
        },
      });
    } else {
      if (!moduleData.created_by) return;
      createMutation.mutate({
        name: moduleData.name,
        description: moduleData.description || undefined,
        order: moduleData.order,
        status: moduleData.status,
        created_by: moduleData.created_by,
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
          Add Module
        </Button>
      </Box>

      {modulesData?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No modules yet. Add one to get started.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {modulesData?.items.map((mod) => (
            <Grid key={mod.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {mod.name}
                    </Typography>
                    <Chip
                      label={mod.status.replace("_", " ")}
                      color={moduleStatusColor(mod.status)}
                      size="small"
                    />
                  </Box>
                  {mod.description && (
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      {mod.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="textSecondary">
                    Order: {mod.order}
                  </Typography>
                </CardContent>
                <Box display="flex" justifyContent="flex-end" gap={0.5} px={1} pb={1}>
                  <IconButton
                    size="small"
                    color="info"
                    title="View stories"
                    onClick={() => router.push(`/projects/${projectId}/modules/${mod.id}`)}
                  >
                    <IconExternalLink size={16} />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={() => openEdit(mod)}>
                    <IconPencil size={16} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(mod)}>
                    <IconTrash size={16} />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {(modulesData?.total ?? 0) > rowsPerPage && (
        <TablePagination
          component="div"
          count={modulesData?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={() => {}}
          rowsPerPageOptions={[20]}
        />
      )}

      {/* Module Form */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingModule ? "Edit Module" : "Add Module"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                label="Module Name"
                fullWidth
                required
                value={moduleData.name}
                onChange={(e) => setModuleData((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={moduleData.description}
                onChange={(e) => setModuleData((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={moduleData.status}
                  label="Status"
                  onChange={(e) =>
                    setModuleData((p) => ({ ...p, status: e.target.value as ModuleStatus }))
                  }
                >
                  {MODULE_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Order"
                type="number"
                fullWidth
                value={moduleData.order}
                onChange={(e) =>
                  setModuleData((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            {!editingModule && (
              <Grid size={12}>
                <FormControl fullWidth required>
                  <InputLabel>Created By</InputLabel>
                  <Select
                    value={moduleData.created_by}
                    label="Created By"
                    onChange={(e) => setModuleData((p) => ({ ...p, created_by: e.target.value }))}
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
              : editingModule
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Module */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Module</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? All associated stories will also be
            removed.
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            Choose whether to also delete linked JIRA issues for all stories in this module.
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
