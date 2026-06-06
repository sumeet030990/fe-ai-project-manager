"use client";
import React, { useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconChevronDown,
  IconFileUpload,
  IconRobot,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeBRD, saveBRDAnalysis } from "@/services/brd";
import { getUsers } from "@/services/users";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import {
  BRDAnalysisResult,
  BRDBulkSaveRequest,
  BRDFeatureSave,
  BRDSyncStatus,
  BRDStorySave,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const PRIORITY_CONFIG: Record<number, { label: string; color: "error" | "warning" | "info" | "success" | "default" }> = {
  1: { label: "Critical", color: "error" },
  2: { label: "High", color: "warning" },
  3: { label: "Medium", color: "info" },
  4: { label: "Low", color: "success" },
  5: { label: "Nice-to-have", color: "default" },
};

const SYNC_CONFIG: Record<BRDSyncStatus, { label: string; color: "success" | "warning" | "default"; tooltip: string }> = {
  new: { label: "New", color: "success", tooltip: "Will be created" },
  update: { label: "Update", color: "warning", tooltip: "Already exists — will be updated with new values" },
  exists: { label: "Exists", color: "default", tooltip: "Already exists with identical content — no changes needed" },
};

function SyncBadge({ status }: { status: BRDSyncStatus }) {
  const cfg = SYNC_CONFIG[status];
  return (
    <Tooltip title={cfg.tooltip} arrow>
      <Chip label={cfg.label} color={cfg.color} size="small" variant="filled" />
    </Tooltip>
  );
}

function buildDefaultSelection(features: BRDAnalysisResult["features"]) {
  const featSet = new Set<number>();
  const storyMap: Record<number, Set<number>> = {};
  features.forEach((feat, fi) => {
    const actionable = feat.sync_status === "new" || feat.sync_status === "update";
    if (actionable) featSet.add(fi);
    storyMap[fi] = new Set();
    feat.stories.forEach((story, si) => {
      if (story.sync_status === "new" || story.sync_status === "update") {
        storyMap[fi].add(si);
        featSet.add(fi); // ensure feature is selected if any story is selected
      }
    });
  });
  return { featSet, storyMap };
}

export default function BRDAnalysisTab({ projectId }: { projectId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [configId, setConfigId] = useState("");
  const [analysis, setAnalysis] = useState<BRDAnalysisResult | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  const [selectedStories, setSelectedStories] = useState<Record<number, Set<number>>>({});
  const [saveContext, setSaveContext] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [createdBy, setCreatedBy] = useState("");
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: !!analysis,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeBRD(projectId, file!, configId || undefined),
    onSuccess: (result) => {
      setAnalysis(result);
      const { featSet, storyMap } = buildDefaultSelection(result.features);
      const expandMap: Record<number, boolean> = {};
      result.features.forEach((_, fi) => { expandMap[fi] = true; });
      setSelectedFeatures(featSet);
      setSelectedStories(storyMap);
      setExpanded(expandMap);
    },
    onError: () => toast("Analysis failed. Check the file format and AI config.", "error"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: BRDBulkSaveRequest) => saveBRDAnalysis(projectId, payload),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.created_features) parts.push(`${result.created_features} feature${result.created_features !== 1 ? "s" : ""} created`);
      if (result.updated_features) parts.push(`${result.updated_features} updated`);
      if (result.created_stories) parts.push(`${result.created_stories} stor${result.created_stories !== 1 ? "ies" : "y"} created`);
      if (result.updated_stories) parts.push(`${result.updated_stories} updated`);
      toast(parts.join(", ") + ".", "success");
      setAnalysis(null);
      setFile(null);
      setSelectedFeatures(new Set());
      setSelectedStories({});
      setSaveContext(false);
    },
    onError: () => toast("Save failed. Please try again.", "error"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setAnalysis(null); }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setAnalysis(null); }
  };

  const toggleFeature = (fi: number) => {
    const next = new Set(selectedFeatures);
    if (next.has(fi)) {
      next.delete(fi);
      setSelectedStories((prev) => ({ ...prev, [fi]: new Set() }));
    } else {
      next.add(fi);
      const allStories = new Set(analysis!.features[fi].stories.map((_, si) => si));
      setSelectedStories((prev) => ({ ...prev, [fi]: allStories }));
    }
    setSelectedFeatures(next);
  };

  const toggleStory = (fi: number, si: number) => {
    const current = new Set(selectedStories[fi] ?? []);
    current.has(si) ? current.delete(si) : current.add(si);
    setSelectedStories((prev) => ({ ...prev, [fi]: current }));
    const nextFeatures = new Set(selectedFeatures);
    current.size > 0 ? nextFeatures.add(fi) : nextFeatures.delete(fi);
    setSelectedFeatures(nextFeatures);
  };

  const handleSelectAll = () => {
    if (!analysis) return;
    const allFi = new Set(analysis.features.map((_, i) => i));
    const allStories: Record<number, Set<number>> = {};
    analysis.features.forEach((feat, fi) => {
      allStories[fi] = new Set(feat.stories.map((_, si) => si));
    });
    setSelectedFeatures(allFi);
    setSelectedStories(allStories);
  };

  const handleClearAll = () => {
    setSelectedFeatures(new Set());
    setSelectedStories({});
  };

  const handleSave = () => {
    if (!analysis || !createdBy) return;
    const features: BRDFeatureSave[] = [];
    selectedFeatures.forEach((fi) => {
      const feat = analysis.features[fi];
      const storyIndices = selectedStories[fi] ?? new Set();
      const stories: BRDStorySave[] = [];
      storyIndices.forEach((si) => {
        const s = feat.stories[si];
        stories.push({
          title: s.title,
          description: s.description,
          order: s.order,
          story_points: s.story_points,
          priority: s.priority,
          existing_id: s.existing_id,
        });
      });
      features.push({
        name: feat.name,
        description: feat.description,
        order: feat.order,
        priority: feat.priority,
        stories,
        existing_id: feat.existing_id,
      });
    });

    if (features.length === 0) {
      toast("Select at least one feature to save.", "error");
      return;
    }

    saveMutation.mutate({
      created_by: createdBy,
      features,
      project_context: analysis.project_context,
      save_context: saveContext,
    });
  };

  const totalSelectedStories = Array.from(selectedFeatures).reduce(
    (acc, fi) => acc + (selectedStories[fi]?.size ?? 0),
    0
  );

  // Summary stats for the sync status
  const syncStats = analysis
    ? analysis.features.reduce(
        (acc, feat) => {
          acc[feat.sync_status] = (acc[feat.sync_status] ?? 0) + 1;
          feat.stories.forEach((s) => {
            acc[`story_${s.sync_status}`] = (acc[`story_${s.sync_status}`] ?? 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>
      )
    : null;

  return (
    <Box>
      {/* Upload Section */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Upload Business Requirements Document
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: "2px dashed",
                  borderColor: file ? "primary.main" : "divider",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: file ? "primary.50" : "background.default",
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "primary.main", bgcolor: "primary.50" },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileChange}
                />
                {file ? (
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <IconFileUpload size={20} />
                    <Typography variant="body2" fontWeight={500}>
                      {file.name}
                    </Typography>
                    <Tooltip title="Remove file">
                      <Box
                        component="span"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setAnalysis(null);
                        }}
                        sx={{ cursor: "pointer", color: "error.main", display: "flex" }}
                      >
                        <IconX size={16} />
                      </Box>
                    </Tooltip>
                  </Box>
                ) : (
                  <>
                    <IconFileUpload size={32} style={{ opacity: 0.4 }} />
                    <Typography variant="body2" color="textSecondary" mt={1}>
                      Drag & drop or click to upload
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Supports .txt, .pdf, .docx
                    </Typography>
                  </>
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AIModelSelector
                projectId={projectId}
                value={configId}
                onChange={setConfigId}
                label="AI Model (optional)"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={
                  analyzeMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <IconRobot size={16} />
                  )
                }
                disabled={!file || analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysis && (
        <>
          {/* Sync Summary Banner */}
          {syncStats && (
            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              <Typography variant="body2" color="textSecondary" sx={{ alignSelf: "center" }}>
                Features:
              </Typography>
              {(["new", "update", "exists"] as BRDSyncStatus[]).map((s) =>
                syncStats[s] ? (
                  <Chip
                    key={s}
                    label={`${syncStats[s]} ${SYNC_CONFIG[s].label}`}
                    color={SYNC_CONFIG[s].color}
                    size="small"
                    variant="outlined"
                  />
                ) : null
              )}
              <Typography variant="body2" color="textSecondary" sx={{ alignSelf: "center", ml: 1 }}>
                Stories:
              </Typography>
              {(["new", "update", "exists"] as BRDSyncStatus[]).map((s) =>
                syncStats[`story_${s}`] ? (
                  <Chip
                    key={`story_${s}`}
                    label={`${syncStats[`story_${s}`]} ${SYNC_CONFIG[s].label}`}
                    color={SYNC_CONFIG[s].color}
                    size="small"
                    variant="outlined"
                  />
                ) : null
              )}
            </Box>
          )}

          {/* Project Context */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                <Typography variant="h6" fontWeight={600}>
                  Project Context
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveContext}
                      onChange={(e) => setSaveContext(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Save as project info</Typography>}
                />
              </Box>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}
              >
                {analysis.project_context}
              </Typography>
            </CardContent>
          </Card>

          {/* Features Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={600}>
                Features & Stories
              </Typography>
              <Chip label={`${selectedFeatures.size}/${analysis.features.length} features`} size="small" />
              <Chip label={`${totalSelectedStories} stories`} size="small" color="primary" />
            </Box>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={handleClearAll}>
                Clear All
              </Button>
            </Box>
          </Box>

          {/* Feature Accordions */}
          {analysis.features.map((feat, fi) => {
            const isFeatureSelected = selectedFeatures.has(fi);
            const featStories = selectedStories[fi] ?? new Set();
            const allStoriesSelected = feat.stories.length > 0 && featStories.size === feat.stories.length;
            const someStoriesSelected = featStories.size > 0 && !allStoriesSelected;
            const priority = PRIORITY_CONFIG[feat.priority] ?? { label: `P${feat.priority}`, color: "default" as const };

            return (
              <Accordion
                key={fi}
                expanded={expanded[fi] ?? false}
                onChange={() => setExpanded((p) => ({ ...p, [fi]: !p[fi] }))}
                variant="outlined"
                sx={{ mb: 1, "&:before": { display: "none" }, opacity: isFeatureSelected ? 1 : 0.65, transition: "opacity 0.15s" }}
              >
                <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
                  <Box display="flex" alignItems="center" gap={1} width="100%">
                    <Checkbox
                      checked={allStoriesSelected || isFeatureSelected}
                      indeterminate={someStoriesSelected}
                      onClick={(e) => { e.stopPropagation(); toggleFeature(fi); }}
                      size="small"
                    />
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {feat.name}
                      </Typography>
                      {feat.description && (
                        <Typography variant="caption" color="textSecondary" noWrap display="block">
                          {feat.description}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={0.5} mr={1} flexShrink={0} alignItems="center">
                      <SyncBadge status={feat.sync_status} />
                      <Chip label={priority.label} color={priority.color} size="small" variant="outlined" />
                      <Chip label={`#${feat.order}`} size="small" variant="outlined" />
                      <Chip
                        label={`${featStories.size}/${feat.stories.length} stories`}
                        size="small"
                        color={featStories.size > 0 ? "primary" : "default"}
                        variant={featStories.size > 0 ? "filled" : "outlined"}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0 }}>
                  <Divider sx={{ mb: 1 }} />
                  {feat.stories.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No stories for this feature.
                    </Typography>
                  ) : (
                    feat.stories.map((story, si) => {
                      const isStorySelected = featStories.has(si);
                      const sp = PRIORITY_CONFIG[story.priority] ?? { label: `P${story.priority}`, color: "default" as const };
                      return (
                        <Box
                          key={si}
                          display="flex"
                          alignItems="flex-start"
                          gap={1}
                          py={0.75}
                          px={1}
                          sx={{
                            borderRadius: 1,
                            "&:hover": { bgcolor: "action.hover" },
                            opacity: isStorySelected ? 1 : 0.45,
                            transition: "opacity 0.15s",
                          }}
                        >
                          <Checkbox
                            checked={isStorySelected}
                            onChange={() => toggleStory(fi, si)}
                            size="small"
                            sx={{ mt: -0.25, flexShrink: 0 }}
                          />
                          <Box flexGrow={1} minWidth={0}>
                            <Typography variant="body2" fontWeight={500}>
                              {story.title}
                            </Typography>
                            {story.description && (
                              <Typography variant="caption" color="textSecondary" display="block">
                                {story.description}
                              </Typography>
                            )}
                          </Box>
                          <Box display="flex" gap={0.5} flexShrink={0} mt={0.25} alignItems="center">
                            <SyncBadge status={story.sync_status} />
                            <Chip label={`${story.story_points} pts`} size="small" variant="outlined" />
                            <Chip label={sp.label} color={sp.color} size="small" variant="outlined" />
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Save Section */}
          <Card variant="outlined" sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Save Selection
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 5 }}>
                  <FormControl fullWidth size="small" required>
                    <InputLabel>Created By</InputLabel>
                    <Select
                      value={createdBy}
                      label="Created By"
                      onChange={(e) => setCreatedBy(e.target.value)}
                    >
                      {usersData?.items.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    {selectedFeatures.size} feature{selectedFeatures.size !== 1 ? "s" : ""}
                    {" · "}
                    {totalSelectedStories} stor{totalSelectedStories !== 1 ? "ies" : "y"}
                    {saveContext && " · project info updated"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={selectedFeatures.size === 0 || !createdBy || saveMutation.isPending}
                    onClick={handleSave}
                    startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Selected"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
