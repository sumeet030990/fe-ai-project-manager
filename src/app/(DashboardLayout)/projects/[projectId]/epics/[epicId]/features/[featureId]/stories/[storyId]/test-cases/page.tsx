"use client";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
  ListItemText,
  MenuItem,
  OutlinedInput,
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
  IconCheck,
  IconCode,
  IconCopy,
  IconPencil,
  IconPlus,
  IconRobot,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import { getEpic } from "@/services/epics";
import { getFeature } from "@/services/features";
import { getProject } from "@/services/projects";
import { getStory } from "@/services/stories";
import { getTechStacks } from "@/services/tech_stacks";
import {
  createTestCase,
  deleteTestCase,
  generateTestCases,
  getTestCases,
  updateTestCase,
} from "@/services/test-cases";
import { savePrompt } from "@/services/prompts";
import {
  PromptCreate,
  TestCaseCreate,
  TestCaseGenerateRequest,
  TestCaseResponse,
  TestCaseType,
  TestCaseUpdate,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const TEST_CASE_TYPES: TestCaseType[] = ["positive", "negative"];

const AI_OPTIONS = [
  { value: "general", label: "General Purpose" },
  { value: "copilot", label: "GitHub Copilot" },
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "chatgpt", label: "ChatGPT / GPT-4" },
  { value: "gemini", label: "Gemini (Google)" },
];

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
  const epicId = params.epicId as string;
  const featureId = params.featureId as string;
  const storyId = params.storyId as string;

  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTc, setEditingTc] = useState<TestCaseResponse | null>(null);
  const [form, setForm] = useState<TestCaseForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TestCaseResponse | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateContext, setGenerateContext] = useState("");
  const [generateConfigId, setGenerateConfigId] = useState("");
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [selectedTechStackIds, setSelectedTechStackIds] = useState<string[]>([]);
  const [targetAI, setTargetAI] = useState("general");
  const [promptExtraContext, setPromptExtraContext] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });

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

  const { data: feature } = useQuery({
    queryKey: ["feature", epicId, featureId],
    queryFn: () => getFeature(epicId, featureId),
    enabled: !!epicId && !!featureId,
  });

  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ["story", featureId, storyId],
    queryFn: () => getStory(featureId, storyId),
    enabled: !!featureId && !!storyId,
  });

  const { data: tcData, isLoading: tcLoading } = useQuery({
    queryKey: ["test-cases", featureId, storyId, page],
    queryFn: () => getTestCases(featureId, storyId, page + 1, rowsPerPage),
    enabled: !!featureId && !!storyId,
  });

  const { data: techStacksData } = useQuery({
    queryKey: ["tech-stacks", projectId],
    queryFn: () => getTechStacks(projectId),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: TestCaseCreate) => createTestCase(featureId, storyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", featureId, storyId] });
      setFormOpen(false);
      toast("Test case created", "success");
    },
    onError: () => toast("Failed to create test case", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TestCaseUpdate }) =>
      updateTestCase(featureId, storyId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", featureId, storyId] });
      setFormOpen(false);
      setEditingTc(null);
      toast("Test case updated", "success");
    },
    onError: () => toast("Failed to update test case", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTestCase(featureId, storyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", featureId, storyId] });
      setDeleteTarget(null);
      toast("Test case deleted", "success");
    },
    onError: () => toast("Failed to delete test case", "error"),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: TestCaseGenerateRequest) =>
      generateTestCases(featureId, storyId, payload),
    onSuccess: (newTcs) => {
      queryClient.invalidateQueries({ queryKey: ["test-cases", featureId, storyId] });
      setGenerateOpen(false);
      setGenerateContext("");
      setGenerateConfigId("");
      toast(
        `Generated ${newTcs.length} test case${newTcs.length !== 1 ? "s" : ""} successfully`,
        "success"
      );
    },
    onError: () => toast("Failed to generate test cases", "error"),
  });

  const savePromptMutation = useMutation({
    mutationFn: (payload: PromptCreate) => savePrompt(featureId, storyId, payload),
    onSuccess: () => {
      toast("Prompt saved successfully", "success");
    },
    onError: () => toast("Failed to save prompt", "error"),
  });

  const buildPrompt = (): string => {
    const selectedStacks =
      techStacksData?.items.filter((ts) => selectedTechStackIds.includes(ts.id)) ?? [];
    const positiveTcs = tcData?.items.filter((tc) => tc.test_type === "positive") ?? [];
    const negativeTcs = tcData?.items.filter((tc) => tc.test_type === "negative") ?? [];

    const aiInstructions: Record<string, string> = {
      general:
        "Write test code for all the test cases listed above using appropriate testing frameworks and best practices.",
      copilot:
        "Using GitHub Copilot, generate test code for the above test cases. Infer the appropriate testing framework from the technology stack (e.g., Jest for React/Node, pytest for Python, xUnit for .NET). Include inline comments explaining each test scenario.",
      claude:
        "Analyze the story context and existing test cases carefully. Write clean, well-structured test code with descriptive test names and clear assertions. Group tests logically and note any edge cases beyond those already listed.",
      chatgpt:
        "Write comprehensive test code for all the test cases above. Include setup/teardown where needed, mock external dependencies, and ensure each test is isolated and deterministic.",
      gemini:
        "Generate well-structured test code covering all listed test cases. Follow the conventions of the technology stack, use descriptive test names, and organize tests by feature or scenario.",
    };

    let prompt = `# Write Test Cases: ${story?.title ?? "Story"}\n\n`;
    prompt += `## Story Context\n`;
    prompt += `**Title:** ${story?.title ?? ""}\n`;
    if (story?.description) prompt += `**Description:** ${story.description}\n`;
    if (story?.acceptance_criteria) {
      prompt += `\n**Acceptance Criteria:**\n${story.acceptance_criteria}\n`;
    }
    if (story?.business_rules) {
      prompt += `\n**Business Rules:**\n${story.business_rules}\n`;
    }

    if (selectedStacks.length > 0) {
      prompt += `\n## Technology Stack\n`;
      selectedStacks.forEach((ts) => {
        prompt += `- **${ts.name}**${ts.version ? ` v${ts.version}` : ""} [${ts.category}]${ts.description ? ` — ${ts.description}` : ""}\n`;
      });
    }

    if (positiveTcs.length > 0) {
      prompt += `\n## Positive Test Cases (Happy Path)\n`;
      positiveTcs.forEach((tc, i) => {
        prompt += `\n### ${i + 1}. ${tc.title}\n`;
        if (tc.description) prompt += `**Preconditions:** ${tc.description}\n`;
        if (tc.steps) prompt += `**Steps:**\n${tc.steps}\n`;
        if (tc.expected_result) prompt += `**Expected Result:** ${tc.expected_result}\n`;
      });
    }

    if (negativeTcs.length > 0) {
      prompt += `\n## Negative Test Cases (Error Path / Edge Cases)\n`;
      negativeTcs.forEach((tc, i) => {
        prompt += `\n### ${i + 1}. ${tc.title}\n`;
        if (tc.description) prompt += `**Preconditions:** ${tc.description}\n`;
        if (tc.steps) prompt += `**Steps:**\n${tc.steps}\n`;
        if (tc.expected_result) prompt += `**Expected Result:** ${tc.expected_result}\n`;
      });
    }

    prompt += `\n## Your Task\n${aiInstructions[targetAI] ?? aiInstructions.general}\n`;

    if (promptExtraContext.trim()) {
      prompt += `\n## Additional Context\n${promptExtraContext.trim()}\n`;
    }

    return prompt;
  };

  const handleGeneratePrompt = () => {
    setGeneratedPrompt(buildPrompt());
    setPromptDialogOpen(false);
    setPromptPreviewOpen(true);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          onClick={() =>
            router.push(`/projects/${projectId}/epics/${epicId}/features/${featureId}`)
          }
          size="small"
        >
          <IconArrowLeft size={20} />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="caption" color="textSecondary">
            {project?.name} / Epics / {epic?.name} / {feature?.name} / Stories
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
        <Tooltip title="Generate a prompt to write test cases in your preferred AI tool">
          <Button
            variant="outlined"
            startIcon={<IconCode size={16} />}
            onClick={() => setPromptDialogOpen(true)}
          >
            Generate Prompt
          </Button>
        </Tooltip>
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
          <Box mb={2}>
            <AIModelSelector
              projectId={projectId}
              value={generateConfigId}
              onChange={setGenerateConfigId}
            />
          </Box>
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
            onClick={() =>
              generateMutation.mutate({
                context: generateContext || undefined,
                config_id: generateConfigId || undefined,
              })
            }
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Test Cases"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Prompt Config Dialog */}
      <Dialog
        open={promptDialogOpen}
        onClose={() => setPromptDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconCode size={20} />
            Generate Test Case Prompt
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Configure the prompt. It will include all existing positive and negative test cases so
            your chosen AI tool can write the implementation code.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Target AI Tool</InputLabel>
                <Select
                  value={targetAI}
                  label="Target AI Tool"
                  onChange={(e) => setTargetAI(e.target.value)}
                >
                  {AI_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Tech Stack (optional)</InputLabel>
                <Select
                  multiple
                  value={selectedTechStackIds}
                  onChange={(e) => setSelectedTechStackIds(e.target.value as string[])}
                  input={<OutlinedInput label="Tech Stack (optional)" />}
                  renderValue={(selected) =>
                    (selected as string[])
                      .map(
                        (id) =>
                          techStacksData?.items.find((ts) => ts.id === id)?.name ?? id
                      )
                      .join(", ")
                  }
                >
                  {techStacksData?.items.map((ts) => (
                    <MenuItem key={ts.id} value={ts.id}>
                      <Checkbox checked={selectedTechStackIds.includes(ts.id)} />
                      <ListItemText
                        primary={ts.name}
                        secondary={`${ts.category}${ts.version ? ` v${ts.version}` : ""}`}
                      />
                    </MenuItem>
                  ))}
                  {!techStacksData?.items.length && (
                    <MenuItem disabled>
                      <Typography variant="caption" color="textSecondary">
                        No tech stacks configured for this project
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Extra Context (optional)"
                fullWidth
                multiline
                rows={3}
                value={promptExtraContext}
                onChange={(e) => setPromptExtraContext(e.target.value)}
                placeholder="e.g. Use Jest + React Testing Library, mock the API with MSW, follow AAA pattern..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPromptDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<IconCode size={16} />}
            onClick={handleGeneratePrompt}
          >
            Generate Prompt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generated Prompt Preview Dialog */}
      <Dialog
        open={promptPreviewOpen}
        onClose={() => setPromptPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <IconCode size={20} />
              Generated Prompt
            </Box>
            <Chip
              label={AI_OPTIONS.find((o) => o.value === targetAI)?.label ?? targetAI}
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={generatedPrompt}
            slotProps={{ input: { readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setPromptPreviewOpen(false);
              setPromptDialogOpen(true);
            }}
          >
            Back
          </Button>
          <Box flexGrow={1} />
          <Button
            variant="outlined"
            startIcon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={handleCopyPrompt}
            color={copied ? "success" : "primary"}
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const selectedStacks = techStacksData?.items
                .filter((ts) => selectedTechStackIds.includes(ts.id))
                .map((ts) => ts.name)
                .join(", ");
              savePromptMutation.mutate({
                content: generatedPrompt,
                target_ai: targetAI,
                tech_stacks: selectedStacks || undefined,
                extra_context: promptExtraContext || undefined,
              });
            }}
            disabled={savePromptMutation.isPending}
          >
            {savePromptMutation.isPending ? "Saving..." : "Save to Database"}
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
