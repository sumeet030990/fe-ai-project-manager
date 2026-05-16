"use client";
import React, { useState } from "react";
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { IconChevronDown, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTechStack,
  deleteTechStack,
  getTechStacks,
  updateTechStack,
} from "@/services/tech_stacks";
import { createPlugin, deletePlugin, getPlugins, updatePlugin } from "@/services/plugins";
import {
  PluginEcosystem,
  ProjectPluginCreate,
  ProjectPluginResponse,
  ProjectPluginUpdate,
  ProjectTechStackCreate,
  ProjectTechStackResponse,
  ProjectTechStackUpdate,
  TechStackCategory,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const TECH_STACK_CATEGORIES: TechStackCategory[] = [
  "frontend", "backend", "database", "devops", "mobile", "other",
];
const PLUGIN_ECOSYSTEMS: PluginEcosystem[] = [
  "npm", "pip", "maven", "composer", "gem", "nuget", "cargo", "other",
];

const CATEGORY_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "info" | "error"> = {
  frontend: "primary",
  backend: "secondary",
  database: "success",
  devops: "warning",
  mobile: "info",
  other: "error",
};

function PluginsAccordion({
  stack,
  projectId,
  onEditStack,
  onDeleteStack,
  onAddPlugin,
  onEditPlugin,
  onDeletePlugin,
}: {
  stack: ProjectTechStackResponse;
  projectId: string;
  onEditStack: (s: ProjectTechStackResponse) => void;
  onDeleteStack: (s: ProjectTechStackResponse) => void;
  onAddPlugin: (techStackId: string) => void;
  onEditPlugin: (p: ProjectPluginResponse) => void;
  onDeletePlugin: (p: ProjectPluginResponse) => void;
}) {
  const { data: pluginsData } = useQuery({
    queryKey: ["plugins", projectId, stack.id],
    queryFn: () => getPlugins(projectId, stack.id, 1, 50),
  });

  return (
    <Accordion sx={{ mb: 1 }}>
      <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
        <Box display="flex" alignItems="center" gap={1} flexGrow={1} pr={2}>
          <Typography fontWeight={500}>{stack.name}</Typography>
          {stack.version && (
            <Typography variant="caption" color="textSecondary">
              v{stack.version}
            </Typography>
          )}
          <Chip
            label={stack.category}
            color={CATEGORY_COLORS[stack.category] ?? "default"}
            size="small"
          />
          <Box flexGrow={1} />
          <IconButton
            component="div"
            size="small"
            color="primary"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditStack(stack); }}
          >
            <IconPencil size={16} />
          </IconButton>
          <IconButton
            component="div"
            size="small"
            color="error"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteStack(stack); }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {stack.description && (
          <Typography variant="body2" color="textSecondary" mb={2}>
            {stack.description}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2">Plugins</Typography>
          <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => onAddPlugin(stack.id)}>
            Add Plugin
          </Button>
        </Box>
        {pluginsData?.items.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No plugins added yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Ecosystem</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pluginsData?.items.map((plugin) => (
                  <TableRow key={plugin.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {plugin.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{plugin.version ?? "—"}</TableCell>
                    <TableCell>
                      {plugin.ecosystem ? <Chip label={plugin.ecosystem} size="small" /> : "—"}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {plugin.description ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => onEditPlugin(plugin)}>
                        <IconPencil size={14} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDeletePlugin(plugin)}>
                        <IconTrash size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function TechStacksTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const [stackForm, setStackForm] = useState(false);
  const [editingStack, setEditingStack] = useState<ProjectTechStackResponse | null>(null);
  const [deleteStack, setDeleteStack] = useState<ProjectTechStackResponse | null>(null);
  const [stackData, setStackData] = useState({
    name: "",
    version: "",
    category: "frontend" as TechStackCategory,
    description: "",
  });

  const [pluginForm, setPluginForm] = useState<string | null>(null);
  const [editingPlugin, setEditingPlugin] = useState<ProjectPluginResponse | null>(null);
  const [deletePlugin_, setDeletePlugin_] = useState<ProjectPluginResponse | null>(null);
  const [pluginData, setPluginData] = useState({
    name: "",
    version: "",
    ecosystem: "npm" as PluginEcosystem,
    description: "",
  });

  const { data: techStacksData, isLoading } = useQuery({
    queryKey: ["tech-stacks", projectId],
    queryFn: () => getTechStacks(projectId, 1, 50),
  });

  const createStackMutation = useMutation({
    mutationFn: (payload: ProjectTechStackCreate) => createTechStack(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stacks", projectId] });
      setStackForm(false);
      setEditingStack(null);
      toast("Tech stack saved", "success");
    },
    onError: () => toast("Failed to save tech stack", "error"),
  });

  const updateStackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProjectTechStackUpdate }) =>
      updateTechStack(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stacks", projectId] });
      setStackForm(false);
      setEditingStack(null);
      toast("Tech stack updated", "success");
    },
    onError: () => toast("Failed to update tech stack", "error"),
  });

  const deleteStackMutation = useMutation({
    mutationFn: (id: string) => deleteTechStack(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stacks", projectId] });
      setDeleteStack(null);
      toast("Tech stack deleted", "success");
    },
    onError: () => toast("Failed to delete tech stack", "error"),
  });

  const createPluginMutation = useMutation({
    mutationFn: (payload: ProjectPluginCreate) => createPlugin(projectId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["plugins", projectId, vars.tech_stack_id] });
      setPluginForm(null);
      setEditingPlugin(null);
      toast("Plugin saved", "success");
    },
    onError: () => toast("Failed to save plugin", "error"),
  });

  const updatePluginMutation = useMutation({
    mutationFn: ({ id, payload, stackId }: { id: string; payload: ProjectPluginUpdate; stackId: string }) =>
      updatePlugin(projectId, id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["plugins", projectId, vars.stackId] });
      setPluginForm(null);
      setEditingPlugin(null);
      toast("Plugin updated", "success");
    },
    onError: () => toast("Failed to update plugin", "error"),
  });

  const deletePluginMutation = useMutation({
    mutationFn: (id: string) => deletePlugin(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins", projectId] });
      setDeletePlugin_(null);
      toast("Plugin deleted", "success");
    },
    onError: () => toast("Failed to delete plugin", "error"),
  });

  const openAddStack = () => {
    setEditingStack(null);
    setStackData({ name: "", version: "", category: "frontend", description: "" });
    setStackForm(true);
  };

  const openEditStack = (stack: ProjectTechStackResponse) => {
    setEditingStack(stack);
    setStackData({
      name: stack.name,
      version: stack.version ?? "",
      category: stack.category,
      description: stack.description ?? "",
    });
    setStackForm(true);
  };

  const openAddPlugin = (techStackId: string) => {
    setEditingPlugin(null);
    setPluginData({ name: "", version: "", ecosystem: "npm", description: "" });
    setPluginForm(techStackId);
  };

  const openEditPlugin = (plugin: ProjectPluginResponse) => {
    setEditingPlugin(plugin);
    setPluginData({
      name: plugin.name,
      version: plugin.version ?? "",
      ecosystem: plugin.ecosystem ?? "npm",
      description: plugin.description ?? "",
    });
    setPluginForm(plugin.tech_stack_id);
  };

  const handleStackSubmit = () => {
    if (!stackData.name.trim()) return;
    if (editingStack) {
      updateStackMutation.mutate({ id: editingStack.id, payload: stackData });
    } else {
      createStackMutation.mutate(stackData);
    }
  };

  const handlePluginSubmit = () => {
    if (!pluginData.name.trim() || !pluginForm) return;
    if (editingPlugin) {
      updatePluginMutation.mutate({
        id: editingPlugin.id,
        payload: {
          name: pluginData.name,
          version: pluginData.version || undefined,
          ecosystem: pluginData.ecosystem,
          description: pluginData.description || undefined,
        },
        stackId: pluginForm,
      });
    } else {
      createPluginMutation.mutate({
        tech_stack_id: pluginForm,
        name: pluginData.name,
        version: pluginData.version || undefined,
        ecosystem: pluginData.ecosystem,
        description: pluginData.description || undefined,
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
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openAddStack}>
          Add Tech Stack
        </Button>
      </Box>

      {techStacksData?.items.length === 0 ? (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No tech stacks yet. Add one to get started.
        </Typography>
      ) : (
        techStacksData?.items.map((stack) => (
          <PluginsAccordion
            key={stack.id}
            stack={stack}
            projectId={projectId}
            onEditStack={openEditStack}
            onDeleteStack={setDeleteStack}
            onAddPlugin={openAddPlugin}
            onEditPlugin={openEditPlugin}
            onDeletePlugin={setDeletePlugin_}
          />
        ))
      )}

      {/* Tech Stack Form */}
      <Dialog open={stackForm} onClose={() => setStackForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStack ? "Edit Tech Stack" : "Add Tech Stack"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Name"
                fullWidth
                required
                value={stackData.name}
                onChange={(e) => setStackData((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Version"
                fullWidth
                value={stackData.version}
                onChange={(e) => setStackData((p) => ({ ...p, version: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={stackData.category}
                  label="Category"
                  onChange={(e) =>
                    setStackData((p) => ({ ...p, category: e.target.value as TechStackCategory }))
                  }
                >
                  {TECH_STACK_CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={stackData.description}
                onChange={(e) => setStackData((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setStackForm(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStackSubmit}
            disabled={createStackMutation.isPending || updateStackMutation.isPending}
          >
            {createStackMutation.isPending || updateStackMutation.isPending
              ? "Saving..."
              : editingStack
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Plugin Form */}
      <Dialog open={!!pluginForm} onClose={() => setPluginForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPlugin ? "Edit Plugin" : "Add Plugin"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Name"
                fullWidth
                required
                value={pluginData.name}
                onChange={(e) => setPluginData((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Version"
                fullWidth
                value={pluginData.version}
                onChange={(e) => setPluginData((p) => ({ ...p, version: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Ecosystem</InputLabel>
                <Select
                  value={pluginData.ecosystem}
                  label="Ecosystem"
                  onChange={(e) =>
                    setPluginData((p) => ({ ...p, ecosystem: e.target.value as PluginEcosystem }))
                  }
                >
                  {PLUGIN_ECOSYSTEMS.map((e) => (
                    <MenuItem key={e} value={e}>
                      {e.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={pluginData.description}
                onChange={(e) => setPluginData((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPluginForm(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePluginSubmit}
            disabled={createPluginMutation.isPending || updatePluginMutation.isPending}
          >
            {createPluginMutation.isPending || updatePluginMutation.isPending
              ? "Saving..."
              : editingPlugin
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Stack */}
      <Dialog open={!!deleteStack} onClose={() => setDeleteStack(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Tech Stack</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteStack?.name}</strong>? All associated plugins will also be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteStack(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteStackMutation.isPending}
            onClick={() => deleteStack && deleteStackMutation.mutate(deleteStack.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Plugin */}
      <Dialog open={!!deletePlugin_} onClose={() => setDeletePlugin_(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Plugin</DialogTitle>
        <DialogContent>
          <Typography>
            Delete plugin <strong>{deletePlugin_?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletePlugin_(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deletePluginMutation.isPending}
            onClick={() => deletePlugin_ && deletePluginMutation.mutate(deletePlugin_.id)}
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
