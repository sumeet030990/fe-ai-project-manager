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
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import {
  IconExternalLink,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/projects";
import { ProjectCreate, ProjectResponse, ProjectUpdate } from "@/types";
import ProjectFormModal from "./ProjectFormModal";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const statusColor = (
  status: string
): "success" | "warning" | "default" | "error" => {
  if (status === "active") return "success";
  if (status === "archived") return "error";
  return "default";
};

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectResponse | null>(null);
  const [snack, setSnack] = useState<Snack>({
    open: false,
    message: "",
    severity: "success",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", page, rowsPerPage],
    queryFn: () => getProjects(page + 1, rowsPerPage),
  });

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormOpen(false);
      toast("Project created successfully", "success");
    },
    onError: () => toast("Failed to create project", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProjectUpdate }) =>
      updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormOpen(false);
      setEditingProject(null);
      toast("Project updated successfully", "success");
    },
    onError: () => toast("Failed to update project", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
      toast("Project deleted successfully", "success");
    },
    onError: () => toast("Failed to delete project", "error"),
  });

  const handleFormSubmit = (data: ProjectCreate | ProjectUpdate) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, payload: data as ProjectUpdate });
    } else {
      createMutation.mutate(data as ProjectCreate);
    }
  };

  const handleEdit = (project: ProjectResponse) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingProject(null);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer title="Projects" description="Manage projects">
      <DashboardCard
        title="Projects"
        action={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setEditingProject(null);
              setFormOpen(true);
            }}
          >
            Add Project
          </Button>
        }
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Typography color="error" textAlign="center" py={4}>
            Failed to load projects. Make sure the backend is running on{" "}
            {process.env.NEXT_PUBLIC_API_URL}.
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Name</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Description</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Status</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Active</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Created</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary" py={2}>
                          No projects found. Click &quot;Add Project&quot; to
                          get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((project) => (
                      <TableRow key={project.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {project.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {project.description ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.status}
                            color={statusColor(project.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.is_active ? "Active" : "Inactive"}
                            color={project.is_active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(project.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="info"
                            title="View project"
                            onClick={() =>
                              router.push(`/projects/${project.id}`)
                            }
                          >
                            <IconExternalLink size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            title="Edit project"
                            onClick={() => handleEdit(project)}
                          >
                            <IconPencil size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            title="Delete project"
                            onClick={() => setDeleteTarget(project)}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </DashboardCard>

      <ProjectFormModal
        open={formOpen}
        onClose={handleCloseForm}
        project={editingProject}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? This will also delete all
            features and stories.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteTarget && deleteMutation.mutate(deleteTarget.id)
            }
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
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
