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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAIConfig,
  deleteAIConfig,
  getAIConfigs,
  updateAIConfig,
} from "@/services/ai-configs";
import {
  AIProvider,
  ProjectAIConfigCreate,
  ProjectAIConfigResponse,
  ProjectAIConfigUpdate,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "other", label: "Other (OpenAI-compatible)" },
];

const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  other: "",
};

const PROVIDER_COLORS: Record<AIProvider, "primary" | "secondary" | "success" | "warning" | "info"> = {
  claude: "warning",
  openai: "success",
  groq: "primary",
  deepseek: "info",
  other: "secondary",
};

const emptyForm = {
  provider: "groq" as AIProvider,
  api_key: "",
  model_name: DEFAULT_MODELS["groq"],
  is_default: false,
};

export default function AIConfigTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectAIConfigResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectAIConfigResponse | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-configs", projectId],
    queryFn: () => getAIConfigs(projectId, 1, 50),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProjectAIConfigCreate) => createAIConfig(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-configs", projectId] });
      setFormOpen(false);
      toast("AI config added", "success");
    },
    onError: () => toast("Failed to add AI config", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProjectAIConfigUpdate }) =>
      updateAIConfig(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-configs", projectId] });
      setFormOpen(false);
      setEditing(null);
      toast("AI config updated", "success");
    },
    onError: () => toast("Failed to update AI config", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAIConfig(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-configs", projectId] });
      setDeleteTarget(null);
      toast("AI config deleted", "success");
    },
    onError: () => toast("Failed to delete AI config", "error"),
  });

  const openAdd = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (config: ProjectAIConfigResponse) => {
    setEditing(config);
    setFormData({
      provider: config.provider as AIProvider,
      api_key: "",
      model_name: config.model_name,
      is_default: config.is_default,
    });
    setFormOpen(true);
  };

  const handleProviderChange = (provider: AIProvider) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      model_name: DEFAULT_MODELS[provider] || prev.model_name,
    }));
  };

  const handleSubmit = () => {
    if (!formData.model_name.trim()) return;
    if (editing) {
      const payload: ProjectAIConfigUpdate = {
        provider: formData.provider,
        model_name: formData.model_name,
        is_default: formData.is_default,
      };
      if (formData.api_key.trim()) {
        payload.api_key = formData.api_key;
      }
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      if (!formData.api_key.trim()) return;
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="textSecondary">
          Configure AI providers for this project. The default config is used for AI story and test case generation.
        </Typography>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openAdd}>
          Add AI Config
        </Button>
      </Box>

      {data?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No AI configs yet. Add one to enable AI features for this project.
          <br />
          <Typography variant="caption">
            Until a config is added, the system falls back to the server-level Groq key.
          </Typography>
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Provider</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>API Key</TableCell>
                <TableCell>Default</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((config) => (
                <TableRow key={config.id} hover>
                  <TableCell>
                    <Chip
                      label={PROVIDERS.find((p) => p.value === config.provider)?.label ?? config.provider}
                      color={PROVIDER_COLORS[config.provider as AIProvider] ?? "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {config.model_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="textSecondary">
                      {config.api_key_masked}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {config.is_default && (
                      <Chip label="Default" color="success" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(config.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => openEdit(config)}>
                      <IconPencil size={16} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(config)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit AI Config" : "Add AI Config"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={formData.provider}
                  label="Provider"
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                >
                  {PROVIDERS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Model Name"
                fullWidth
                required
                value={formData.model_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, model_name: e.target.value }))}
                helperText="e.g. claude-sonnet-4-6, gpt-4o, llama-3.3-70b-versatile"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={editing ? "API Key (leave blank to keep existing)" : "API Key"}
                fullWidth
                required={!editing}
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))}
                helperText="Stored encrypted at rest. Only the last 8 characters are shown."
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_default}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_default: e.target.checked }))
                    }
                  />
                }
                label="Set as default for this project"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete AI Config</DialogTitle>
        <DialogContent>
          <Typography>
            Delete the <strong>{deleteTarget?.provider}</strong> config ({deleteTarget?.model_name})?
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
            Delete
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
