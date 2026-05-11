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
  IconPencil,
  IconPlus,
  IconRobot,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { getModule } from "@/services/modules";
import { getProject } from "@/services/projects";
import { getStory } from "@/services/stories";
import {
  createTestCase,
  deleteTestCase,
  generateTestCases,
  getTestCases,
  updateTestCase,
} from "@/services/test-cases";
import {
  TestCaseCreate,
  TestCaseGenerateRequest,
  TestCaseResponse,
  TestCaseType,
  TestCaseUpdate,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const TEST_CASE_TYPES: TestCaseType[] = ["positive", "negative"];

const emptyForm = {
  title: "",
  description: "",
  steps: "",
  expected_result: "",
  test_type: "positive" as TestCaseType,
  order: 0,
};

type TestCaseForm = typeof emptyForm;

export default function TestCasesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectId = params.projectId as string;
  const moduleId = params.moduleId as string;
  const storyId = params.storyId as string;

  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTc, setEditingTc] = useState<TestCaseResponse | null>(null);
  const [form, setForm] = useState<TestCaseForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TestCaseResponse | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateContext, setGenerateContext] = useState("");
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: module } = useQuery({
    queryKey: ["module", projectId, moduleId],
    queryFn: () => getModule(projectId, moduleId),
    enabled: !!projectId && !!moduleId,
  });

  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ["story", moduleId, storyId],
    queryFn: () => getStory(moduleId, storyId),
    enabled: !!moduleId && !!storyId,
  });

  const { data: tcData, isLoading: tcLoading } = useQuery({
    queryKey: ["test-cases", moduleId, storyId, page],
    queryFn: () => getTestCases(moduleId, storyId, page + 1, rowsPerPage),
    enabled: !!moduleId && !!storyId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: TestCaseCreate) => createTestCase(moduleId, storyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", moduleId, storyId] });
      setFormOpen(false);
      toast("Test case created", "success");
    },
    onError: () => toast("Failed to create test case", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TestCaseUpdate }) =>
      updateTestCase(moduleId, storyId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", moduleId, storyId] });
      setFormOpen(false);
      setEditingTc(null);
      toast("Test case updated", "success");
    },
    onError: () => toast("Failed to update test case", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTestCase(moduleId, storyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", moduleId, storyId] });
      setDeleteTarget(null);
      toast("Test case deleted", "success");
    },
    onError: () => toast("Failed to delete test case", "error"),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: TestCaseGenerateRequest) =>
      generateTestCases(moduleId, storyId, payload),
    onSuccess: (newTcs) => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", moduleId, storyId] });
      setGenerateOpen(false);
      setGenerateContext("");
      toast(
        `Generated ${newTcs.length} test case${newTcs.length !== 1 ? "s" : ""} successfully`,
        "success"
      );
    },
    onError: () => toast("Failed to generate test cases", "error"),
  });

  const openAdd = () => {
    setEditingTc(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (tc: TestCaseResponse) => {
    setEditingTc(tc);
    setForm({
      title: tc.title,
      description: tc.description ?? "",
      steps: tc.steps ?? "",
      expected_result: tc.expected_result ?? "",
      test_type: tc.test_type,
      order: tc.order,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (editingTc) {
      updateMutation.mutate({
        id: editingTc.id,
        payload: {
          title: form.title,
          description: form.description || undefined,
          steps: form.steps || undefined,
          expected_result: form.expected_result || undefined,
          test_type: form.test_type,
          order: form.order,
        },
      });
    } else {
      createMutation.mutate({
        title: form.title,
        description: form.description || undefined,
        steps: form.steps || undefined,
        expected_result: form.expected_result || undefined,
        test_type: form.test_type,
        order: form.order,
      });
    }
  };

  const positiveCount = tcData?.items.filter((tc) => tc.test_type === "positive").length ?? 0;
  const negativeCount = tcData?.items.filter((tc) => tc.test_type === "negative").length ?? 0;

  return (
    <PageContainer title="Test Cases" description="QA test cases for this story">
      {/* Breadcrumb Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton
          onClick={() => router.push(`/projects/${projectId}/modules/${moduleId}`)}
          size="small"
        >
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="caption" color="textSecondary">
            {project?.name} / {module?.name} / Stories
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {storyLoading ? "..." : story?.title}
          </Typography>
          {story?.description && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              {story.description}
            </Typography>
          )}
        </Box>
        <Box display="flex" gap={1}>
          {tcData && (
            <>
              <Chip label={`${positiveCount} positive`} color="success" size="small" variant="outlined" />
              <Chip label={`${negativeCount} negative`} color="error" size="small" variant="outlined" />
            </>
          )}
        </Box>
      </Box>

      {/* Story acceptance criteria summary */}
      {(story?.acceptance_criteria || story?.business_rules) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
          {story.acceptance_criteria && (
            <Box mb={story.business_rules ? 1.5 : 0}>
              <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                Acceptance Criteria
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {story.acceptance_criteria}
              </Typography>
            </Box>
          )}
          {story.business_rules && (
            <Box>
              <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                Business Rules
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {story.business_rules}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Actions */}
      <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
        <Tooltip title="AI: Generate positive and negative test cases from story details">
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
            AI Generate Test Cases
          </Button>
        </Tooltip>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={openAdd}>
          Add Test Case
        </Button>
      </Box>

      {/* Test Cases Table */}
      {tcLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }}>
                    <Typography variant="subtitle2">#</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">Title</Typography>
                  </TableCell>
                  <TableCell sx={{ width: 110 }}>
                    <Typography variant="subtitle2">Type</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">Steps</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">Expected Result</Typography>
                  </TableCell>
                  <TableCell sx={{ width: 50 }}>
                    <Typography variant="subtitle2">AI</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">Actions</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tcData?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary" py={2}>
                        No test cases yet. Add one manually or use AI generation.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tcData?.items.map((tc, idx) => (
                    <TableRow key={tc.id} hover>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {tc.order || idx + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {tc.title}
                        </Typography>
                        {tc.description && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{
                              display: "block",
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tc.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tc.test_type}
                          color={tc.test_type === "positive" ? "success" : "error"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {tc.steps ? (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tc.steps}
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {tc.expected_result ? (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tc.expected_result}
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {tc.is_ai_generated && (
                          <Chip
                            label="AI"
                            icon={<IconRobot size={12} />}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="primary" onClick={() => openEdit(tc)}>
                          <IconPencil size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(tc)}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {(tcData?.total ?? 0) > rowsPerPage && (
            <TablePagination
              component="div"
              count={tcData?.total ?? 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={() => {}}
              rowsPerPageOptions={[50]}
            />
          )}
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTc ? "Edit Test Case" : "Add Test Case"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                label="Title"
                fullWidth
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={form.test_type}
                  label="Type"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, test_type: e.target.value as TestCaseType }))
                  }
                >
                  {TEST_CASE_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
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
                value={form.order}
                onChange={(e) =>
                  setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 }))
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Description / Preconditions"
                fullWidth
                multiline
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Context and preconditions required before running this test"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Steps"
                fullWidth
                multiline
                rows={4}
                value={form.steps}
                onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))}
                placeholder="1. Navigate to...\n2. Enter...\n3. Click..."
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Expected Result"
                fullWidth
                multiline
                rows={3}
                value={form.expected_result}
                onChange={(e) => setForm((p) => ({ ...p, expected_result: e.target.value }))}
                placeholder="The system should..."
              />
            </Grid>
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
              : editingTc
              ? "Update"
              : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconRobot size={20} />
            AI Generate Test Cases
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            The AI will generate both positive (happy path) and negative (error path, edge cases)
            test cases based on the story&apos;s acceptance criteria and business rules. Optionally
            add extra context below.
          </Typography>
          <TextField
            label="Additional Context (optional)"
            fullWidth
            multiline
            rows={4}
            value={generateContext}
            onChange={(e) => setGenerateContext(e.target.value)}
            placeholder="e.g. Focus on boundary conditions for the amount field, include OAuth failure scenarios..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              generateMutation.isPending ? <CircularProgress size={16} /> : <IconRobot size={16} />
            }
            onClick={() => generateMutation.mutate({ context: generateContext || undefined })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Test Cases"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Test Case</DialogTitle>
        <DialogContent>
          <Typography>
            Delete test case <strong>&quot;{deleteTarget?.title}&quot;</strong>? This action cannot
            be undone.
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
