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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconChevronDown,
  IconEye,
  IconFileUpload,
  IconRobot,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeBRD, refineBRDItem, saveBRDAnalysis } from "@/services/brd";
import { getUsers } from "@/services/users";
import AIModelSelector from "@/app/(DashboardLayout)/components/shared/AIModelSelector";
import {
  BRDAnalysisResult,
  BRDBulkSaveRequest,
  BRDEpicResult,
  BRDEpicSave,
  BRDFeatureResult,
  BRDFeatureSave,
  BRDRefineRequest,
  BRDStorySave,
  BRDStoryResult,
  BRDSyncStatus,
} from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

type RefineTarget = {
  type: "epic" | "feature" | "story";
  ei: number;
  fi?: number;
  si?: number;
  name?: string;
  title?: string;
  description?: string;
  business_rules?: string;
  acceptance_criteria?: string;
};

const PRIORITY_CONFIG: Record<number, { label: string; color: "error" | "warning" | "info" | "success" | "default" }> = {
  1: { label: "Critical", color: "error" },
  2: { label: "High", color: "warning" },
  3: { label: "Medium", color: "info" },
  4: { label: "Low", color: "success" },
  5: { label: "Nice-to-have", color: "default" },
};

const SYNC_CONFIG: Record<BRDSyncStatus, { label: string; color: "success" | "warning" | "default"; tooltip: string }> = {
  new: { label: "New", color: "success", tooltip: "Will be created" },
  update: { label: "Update", color: "warning", tooltip: "Already exists — will be updated" },
  exists: { label: "Exists", color: "default", tooltip: "Already exists with identical content" },
};

function SyncBadge({ status }: { status: BRDSyncStatus }) {
  const cfg = SYNC_CONFIG[status];
  return (
    <Tooltip title={cfg.tooltip} arrow>
      <Chip label={cfg.label} color={cfg.color} size="small" variant="filled" />
    </Tooltip>
  );
}

function DetailSection({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box mb={2}>
      <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {value}
      </Typography>
    </Box>
  );
}

function buildDefaultSelection(epics: BRDEpicResult[]) {
  const epicSet = new Set<number>();
  const featMap: Record<number, Set<number>> = {};
  const storyMap: Record<string, Set<number>> = {};

  epics.forEach((epic, ei) => {
    featMap[ei] = new Set();
    epic.features.forEach((feat, fi) => {
      const key = `${ei}:${fi}`;
      storyMap[key] = new Set();
      feat.stories.forEach((story, si) => {
        if (story.sync_status === "new" || story.sync_status === "update") {
          storyMap[key].add(si);
          featMap[ei].add(fi);
          epicSet.add(ei);
        }
      });
      if ((feat.sync_status === "new" || feat.sync_status === "update") && !featMap[ei].has(fi)) {
        featMap[ei].add(fi);
        epicSet.add(ei);
      }
    });
    if ((epic.sync_status === "new" || epic.sync_status === "update") && !epicSet.has(ei)) {
      epicSet.add(ei);
    }
  });

  return { epicSet, featMap, storyMap };
}

export default function BRDAnalysisTab({ projectId }: { projectId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [configId, setConfigId] = useState("");
  const [analysis, setAnalysis] = useState<BRDAnalysisResult | null>(null);

  // Selection state
  const [selectedEpics, setSelectedEpics] = useState<Set<number>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Record<number, Set<number>>>({});
  const [selectedStories, setSelectedStories] = useState<Record<string, Set<number>>>({});

  // Expansion state
  const [expandedEpics, setExpandedEpics] = useState<Record<number, boolean>>({});
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});

  // View modals
  const [viewEpic, setViewEpic] = useState<{ epic: BRDEpicResult; ei: number } | null>(null);
  const [viewFeature, setViewFeature] = useState<{ feat: BRDFeatureResult; ei: number; fi: number } | null>(null);
  const [viewStory, setViewStory] = useState<{ story: BRDStoryResult; ei: number; fi: number; si: number } | null>(null);

  // Refine state
  const [refineTarget, setRefineTarget] = useState<RefineTarget | null>(null);
  const [refineContext, setRefineContext] = useState("");
  const [refineConfigId, setRefineConfigId] = useState("");

  const [saveContext, setSaveContext] = useState(false);
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
      const { epicSet, featMap, storyMap } = buildDefaultSelection(result.epics);
      const expandEpics: Record<number, boolean> = {};
      result.epics.forEach((_, ei) => { expandEpics[ei] = true; });
      setSelectedEpics(epicSet);
      setSelectedFeatures(featMap);
      setSelectedStories(storyMap);
      setExpandedEpics(expandEpics);
      setExpandedFeatures({});
    },
    onError: () => toast("Analysis failed. Check the file format and AI config.", "error"),
  });

  const refineMutation = useMutation({
    mutationFn: (payload: BRDRefineRequest) => refineBRDItem(projectId, payload),
    onSuccess: (result) => {
      if (!refineTarget) return;
      const { type, ei, fi, si } = refineTarget;
      setAnalysis((prev) => {
        if (!prev) return prev;
        const newEpics = prev.epics.map((epic, eidx) => {
          if (eidx !== ei) return epic;
          if (type === "epic") {
            return { ...epic, description: result.description ?? epic.description };
          }
          const newFeatures = epic.features.map((feat, fidx) => {
            if (fidx !== fi) return feat;
            if (type === "feature") {
              return {
                ...feat,
                description: result.description ?? feat.description,
                business_rules: result.business_rules ?? feat.business_rules,
                acceptance_criteria: result.acceptance_criteria ?? feat.acceptance_criteria,
              };
            }
            const newStories = feat.stories.map((story, sidx) => {
              if (sidx !== si) return story;
              return {
                ...story,
                description: result.description ?? story.description,
                business_rules: result.business_rules ?? story.business_rules,
                acceptance_criteria: result.acceptance_criteria ?? story.acceptance_criteria,
              };
            });
            return { ...feat, stories: newStories };
          });
          return { ...epic, features: newFeatures };
        });
        return { ...prev, epics: newEpics };
      });
      setRefineTarget(null);
      setRefineContext("");
      toast("Refined successfully", "success");
    },
    onError: () => toast("Refinement failed. Please try again.", "error"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: BRDBulkSaveRequest) => saveBRDAnalysis(projectId, payload),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.created_epics) parts.push(`${result.created_epics} epic${result.created_epics !== 1 ? "s" : ""} created`);
      if (result.updated_epics) parts.push(`${result.updated_epics} epic${result.updated_epics !== 1 ? "s" : ""} updated`);
      if (result.created_features) parts.push(`${result.created_features} feature${result.created_features !== 1 ? "s" : ""} created`);
      if (result.updated_features) parts.push(`${result.updated_features} updated`);
      if (result.created_stories) parts.push(`${result.created_stories} stor${result.created_stories !== 1 ? "ies" : "y"} created`);
      if (result.updated_stories) parts.push(`${result.updated_stories} updated`);
      toast(parts.join(", ") + ".", "success");
      setAnalysis(null);
      setFile(null);
      setSelectedEpics(new Set());
      setSelectedFeatures({});
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

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleEpic = (ei: number) => {
    const next = new Set(selectedEpics);
    if (next.has(ei)) {
      next.delete(ei);
      setSelectedFeatures((prev) => ({ ...prev, [ei]: new Set() }));
      setSelectedStories((prev) => {
        const updated = { ...prev };
        analysis!.epics[ei].features.forEach((_, fi) => { delete updated[`${ei}:${fi}`]; });
        return updated;
      });
    } else {
      next.add(ei);
      const allFeats = new Set(analysis!.epics[ei].features.map((_, fi) => fi));
      setSelectedFeatures((prev) => ({ ...prev, [ei]: allFeats }));
      setSelectedStories((prev) => {
        const updated = { ...prev };
        analysis!.epics[ei].features.forEach((feat, fi) => {
          updated[`${ei}:${fi}`] = new Set(feat.stories.map((_, si) => si));
        });
        return updated;
      });
    }
    setSelectedEpics(next);
  };

  const toggleFeature = (ei: number, fi: number) => {
    const current = new Set(selectedFeatures[ei] ?? []);
    if (current.has(fi)) {
      current.delete(fi);
      setSelectedStories((prev) => { const u = { ...prev }; delete u[`${ei}:${fi}`]; return u; });
    } else {
      current.add(fi);
      const allStories = new Set(analysis!.epics[ei].features[fi].stories.map((_, si) => si));
      setSelectedStories((prev) => ({ ...prev, [`${ei}:${fi}`]: allStories }));
    }
    setSelectedFeatures((prev) => ({ ...prev, [ei]: current }));
    const nextEpics = new Set(selectedEpics);
    current.size > 0 ? nextEpics.add(ei) : nextEpics.delete(ei);
    setSelectedEpics(nextEpics);
  };

  const toggleStory = (ei: number, fi: number, si: number) => {
    const key = `${ei}:${fi}`;
    const current = new Set(selectedStories[key] ?? []);
    current.has(si) ? current.delete(si) : current.add(si);
    setSelectedStories((prev) => ({ ...prev, [key]: current }));
    const newFeats = new Set(selectedFeatures[ei] ?? []);
    current.size > 0 ? newFeats.add(fi) : newFeats.delete(fi);
    setSelectedFeatures((prev) => ({ ...prev, [ei]: newFeats }));
    const nextEpics = new Set(selectedEpics);
    newFeats.size > 0 ? nextEpics.add(ei) : nextEpics.delete(ei);
    setSelectedEpics(nextEpics);
  };

  const handleSelectAll = () => {
    if (!analysis) return;
    const allEi = new Set(analysis.epics.map((_, i) => i));
    const allFeats: Record<number, Set<number>> = {};
    const allStories: Record<string, Set<number>> = {};
    analysis.epics.forEach((epic, ei) => {
      allFeats[ei] = new Set(epic.features.map((_, fi) => fi));
      epic.features.forEach((feat, fi) => {
        allStories[`${ei}:${fi}`] = new Set(feat.stories.map((_, si) => si));
      });
    });
    setSelectedEpics(allEi);
    setSelectedFeatures(allFeats);
    setSelectedStories(allStories);
  };

  const handleClearAll = () => {
    setSelectedEpics(new Set());
    setSelectedFeatures({});
    setSelectedStories({});
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!analysis || !createdBy) return;
    const epics: BRDEpicSave[] = [];
    selectedEpics.forEach((ei) => {
      const epic = analysis.epics[ei];
      const featIdxs = selectedFeatures[ei] ?? new Set();
      const features: BRDFeatureSave[] = [];
      featIdxs.forEach((fi) => {
        const feat = epic.features[fi];
        const storyIdxs = selectedStories[`${ei}:${fi}`] ?? new Set();
        const stories: BRDStorySave[] = [];
        storyIdxs.forEach((si) => {
          const s = feat.stories[si];
          stories.push({
            title: s.title,
            description: s.description,
            business_rules: s.business_rules,
            acceptance_criteria: s.acceptance_criteria,
            order: s.order,
            story_points: s.story_points,
            priority: s.priority,
            existing_id: s.existing_id,
          });
        });
        features.push({
          name: feat.name,
          description: feat.description,
          business_rules: feat.business_rules,
          acceptance_criteria: feat.acceptance_criteria,
          order: feat.order,
          priority: feat.priority,
          stories,
          existing_id: feat.existing_id,
        });
      });
      epics.push({
        name: epic.name,
        description: epic.description,
        order: epic.order,
        priority: epic.priority,
        features,
        existing_id: epic.existing_id,
      });
    });

    if (epics.length === 0) {
      toast("Select at least one epic to save.", "error");
      return;
    }

    saveMutation.mutate({
      created_by: createdBy,
      epics,
      project_context: analysis.project_context,
      save_context: saveContext,
    });
  };

  // ── Derived counts ─────────────────────────────────────────────────────────

  const totalSelectedFeatures = Array.from(selectedEpics).reduce(
    (acc, ei) => acc + (selectedFeatures[ei]?.size ?? 0),
    0
  );
  const totalSelectedStories = Array.from(selectedEpics).reduce(
    (acc, ei) =>
      acc +
      Array.from(selectedFeatures[ei] ?? []).reduce(
        (acc2, fi) => acc2 + (selectedStories[`${ei}:${fi}`]?.size ?? 0),
        0
      ),
    0
  );

  const syncStats = analysis
    ? analysis.epics.reduce((acc, epic) => {
        acc[`epic_${epic.sync_status}`] = (acc[`epic_${epic.sync_status}`] ?? 0) + 1;
        epic.features.forEach((feat) => {
          acc[`feat_${feat.sync_status}`] = (acc[`feat_${feat.sync_status}`] ?? 0) + 1;
          feat.stories.forEach((s) => {
            acc[`story_${s.sync_status}`] = (acc[`story_${s.sync_status}`] ?? 0) + 1;
          });
        });
        return acc;
      }, {} as Record<string, number>)
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
                    <Typography variant="body2" fontWeight={500}>{file.name}</Typography>
                    <Tooltip title="Remove file">
                      <Box
                        component="span"
                        onClick={(e) => { e.stopPropagation(); setFile(null); setAnalysis(null); }}
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
            <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="textSecondary">Epics:</Typography>
              {(["new", "update", "exists"] as BRDSyncStatus[]).map((s) =>
                syncStats[`epic_${s}`] ? (
                  <Chip key={`e_${s}`} label={`${syncStats[`epic_${s}`]} ${SYNC_CONFIG[s].label}`} color={SYNC_CONFIG[s].color} size="small" variant="outlined" />
                ) : null
              )}
              <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>Features:</Typography>
              {(["new", "update", "exists"] as BRDSyncStatus[]).map((s) =>
                syncStats[`feat_${s}`] ? (
                  <Chip key={`f_${s}`} label={`${syncStats[`feat_${s}`]} ${SYNC_CONFIG[s].label}`} color={SYNC_CONFIG[s].color} size="small" variant="outlined" />
                ) : null
              )}
              <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>Stories:</Typography>
              {(["new", "update", "exists"] as BRDSyncStatus[]).map((s) =>
                syncStats[`story_${s}`] ? (
                  <Chip key={`s_${s}`} label={`${syncStats[`story_${s}`]} ${SYNC_CONFIG[s].label}`} color={SYNC_CONFIG[s].color} size="small" variant="outlined" />
                ) : null
              )}
            </Box>
          )}

          {/* Project Context */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                <Typography variant="h6" fontWeight={600}>Project Context</Typography>
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

          {/* Epics Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={600}>Epics → Features → Stories</Typography>
              <Chip label={`${selectedEpics.size}/${analysis.epics.length} epics`} size="small" />
              <Chip label={`${totalSelectedFeatures} features`} size="small" color="secondary" />
              <Chip label={`${totalSelectedStories} stories`} size="small" color="primary" />
            </Box>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" onClick={handleSelectAll}>Select All</Button>
              <Button size="small" variant="outlined" color="inherit" onClick={handleClearAll}>Clear All</Button>
            </Box>
          </Box>

          {/* Epic Accordions */}
          {analysis.epics.map((epic, ei) => {
            const isEpicSelected = selectedEpics.has(ei);
            const epicFeats = selectedFeatures[ei] ?? new Set();
            const priority = PRIORITY_CONFIG[epic.priority] ?? { label: `P${epic.priority}`, color: "default" as const };
            const allFeatsSelected = epic.features.length > 0 && epicFeats.size === epic.features.length;
            const someFeatsSelected = epicFeats.size > 0 && !allFeatsSelected;

            return (
              <Accordion
                key={ei}
                expanded={expandedEpics[ei] ?? false}
                onChange={() => setExpandedEpics((p) => ({ ...p, [ei]: !p[ei] }))}
                variant="outlined"
                sx={{ mb: 1.5, "&:before": { display: "none" }, opacity: isEpicSelected ? 1 : 0.6, transition: "opacity 0.15s" }}
              >
                <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
                  <Box display="flex" alignItems="center" gap={1} width="100%">
                    <Checkbox
                      checked={allFeatsSelected || isEpicSelected}
                      indeterminate={someFeatsSelected}
                      onClick={(e) => { e.stopPropagation(); toggleEpic(ei); }}
                      size="small"
                    />
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {epic.name}
                      </Typography>
                      {epic.description && (
                        <Typography variant="caption" color="textSecondary" noWrap display="block">
                          {epic.description}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={0.5} mr={1} flexShrink={0} alignItems="center">
                      <SyncBadge status={epic.sync_status} />
                      <Chip label={priority.label} color={priority.color} size="small" variant="outlined" />
                      <Chip label={`#${epic.order}`} size="small" variant="outlined" />
                      <Chip
                        label={`${epicFeats.size}/${epic.features.length} features`}
                        size="small"
                        color={epicFeats.size > 0 ? "secondary" : "default"}
                        variant={epicFeats.size > 0 ? "filled" : "outlined"}
                      />
                      <Tooltip title="View epic details">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setViewEpic({ epic, ei }); }}
                        >
                          <IconEye size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="AI Refine epic">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefineTarget({ type: "epic", ei, name: epic.name, description: epic.description });
                            setRefineContext("");
                            setRefineConfigId("");
                          }}
                        >
                          <IconSparkles size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                  <Divider sx={{ mb: 1 }} />
                  {epic.features.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ pl: 1 }}>
                      No features for this epic.
                    </Typography>
                  ) : (
                    epic.features.map((feat, fi) => {
                      const isFeatSelected = epicFeats.has(fi);
                      const storyKey = `${ei}:${fi}`;
                      const featStories = selectedStories[storyKey] ?? new Set();
                      const featPriority = PRIORITY_CONFIG[feat.priority] ?? { label: `P${feat.priority}`, color: "default" as const };
                      const allStoriesSelected = feat.stories.length > 0 && featStories.size === feat.stories.length;
                      const someStoriesSelected = featStories.size > 0 && !allStoriesSelected;

                      return (
                        <Accordion
                          key={fi}
                          expanded={expandedFeatures[storyKey] ?? false}
                          onChange={() => setExpandedFeatures((p) => ({ ...p, [storyKey]: !p[storyKey] }))}
                          variant="outlined"
                          sx={{
                            ml: 3,
                            mb: 0.5,
                            "&:before": { display: "none" },
                            opacity: isFeatSelected ? 1 : 0.55,
                            transition: "opacity 0.15s",
                          }}
                        >
                          <AccordionSummary expandIcon={<IconChevronDown size={16} />}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Checkbox
                                checked={allStoriesSelected || isFeatSelected}
                                indeterminate={someStoriesSelected}
                                onClick={(e) => { e.stopPropagation(); toggleFeature(ei, fi); }}
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
                                <Chip label={featPriority.label} color={featPriority.color} size="small" variant="outlined" />
                                <Chip
                                  label={`${featStories.size}/${feat.stories.length} stories`}
                                  size="small"
                                  color={featStories.size > 0 ? "primary" : "default"}
                                  variant={featStories.size > 0 ? "filled" : "outlined"}
                                />
                                <Tooltip title="View feature details">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); setViewFeature({ feat, ei, fi }); }}
                                  >
                                    <IconEye size={15} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="AI Refine feature">
                                  <IconButton
                                    size="small"
                                    color="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRefineTarget({ type: "feature", ei, fi, name: feat.name, description: feat.description, business_rules: feat.business_rules, acceptance_criteria: feat.acceptance_criteria });
                                      setRefineContext("");
                                      setRefineConfigId("");
                                    }}
                                  >
                                    <IconSparkles size={15} />
                                  </IconButton>
                                </Tooltip>
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
                                      opacity: isStorySelected ? 1 : 0.4,
                                      transition: "opacity 0.15s",
                                    }}
                                  >
                                    <Checkbox
                                      checked={isStorySelected}
                                      onChange={() => toggleStory(ei, fi, si)}
                                      size="small"
                                      sx={{ mt: -0.25, flexShrink: 0 }}
                                    />
                                    <Box flexGrow={1} minWidth={0}>
                                      <Typography variant="body2" fontWeight={500}>
                                        {story.title}
                                      </Typography>
                                      {story.description && (
                                        <Typography variant="caption" color="textSecondary" display="block" noWrap>
                                          {story.description}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Box display="flex" gap={0.5} flexShrink={0} mt={0.25} alignItems="center">
                                      <SyncBadge status={story.sync_status} />
                                      <Chip label={`${story.story_points} pts`} size="small" variant="outlined" />
                                      <Chip label={sp.label} color={sp.color} size="small" variant="outlined" />
                                      <Tooltip title="View story details">
                                        <IconButton
                                          size="small"
                                          onClick={() => setViewStory({ story, ei, fi, si })}
                                        >
                                          <IconEye size={14} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="AI Refine story">
                                        <IconButton
                                          size="small"
                                          color="secondary"
                                          onClick={() => {
                                            setRefineTarget({ type: "story", ei, fi, si, title: story.title, description: story.description, business_rules: story.business_rules, acceptance_criteria: story.acceptance_criteria });
                                            setRefineContext("");
                                            setRefineConfigId("");
                                          }}
                                        >
                                          <IconSparkles size={14} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>
                                );
                              })
                            )}
                          </AccordionDetails>
                        </Accordion>
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
              <Typography variant="h6" fontWeight={600} mb={2}>Save Selection</Typography>
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
                    {selectedEpics.size} epic{selectedEpics.size !== 1 ? "s" : ""}
                    {" · "}
                    {totalSelectedFeatures} feature{totalSelectedFeatures !== 1 ? "s" : ""}
                    {" · "}
                    {totalSelectedStories} stor{totalSelectedStories !== 1 ? "ies" : "y"}
                    {saveContext && " · project info updated"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={selectedEpics.size === 0 || !createdBy || saveMutation.isPending}
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

      {/* ── View: Epic ──────────────────────────────────────────────────────── */}
      <Dialog open={!!viewEpic} onClose={() => setViewEpic(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>{viewEpic?.epic.name}</Typography>
          <Box display="flex" gap={1} mt={0.5}>
            <SyncBadge status={viewEpic?.epic.sync_status ?? "new"} />
            {viewEpic && <Chip label={PRIORITY_CONFIG[viewEpic.epic.priority]?.label ?? `P${viewEpic.epic.priority}`} color={PRIORITY_CONFIG[viewEpic.epic.priority]?.color ?? "default"} size="small" />}
            {viewEpic && <Chip label={`Order #${viewEpic.epic.order}`} size="small" variant="outlined" />}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewEpic && (
            <Box>
              <DetailSection label="Description" value={viewEpic.epic.description} />
              {!viewEpic.epic.description && (
                <Typography variant="body2" color="textSecondary" fontStyle="italic" mb={2}>
                  No description yet. Use AI Refine to enrich this epic.
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Features ({viewEpic.epic.features.length})
              </Typography>
              {viewEpic.epic.features.map((feat, fi) => (
                <Box key={fi} display="flex" alignItems="center" gap={1} mb={0.5} py={0.5}>
                  <Chip label={`#${feat.order}`} size="small" variant="outlined" />
                  <Typography variant="body2" flexGrow={1}>{feat.name}</Typography>
                  <SyncBadge status={feat.sync_status} />
                  <Typography variant="caption" color="textSecondary">{feat.stories.length} stories</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setViewEpic(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── View: Feature ────────────────────────────────────────────────────── */}
      <Dialog open={!!viewFeature} onClose={() => setViewFeature(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>{viewFeature?.feat.name}</Typography>
          <Box display="flex" gap={1} mt={0.5}>
            <SyncBadge status={viewFeature?.feat.sync_status ?? "new"} />
            {viewFeature && <Chip label={PRIORITY_CONFIG[viewFeature.feat.priority]?.label ?? `P${viewFeature.feat.priority}`} color={PRIORITY_CONFIG[viewFeature.feat.priority]?.color ?? "default"} size="small" />}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewFeature && (
            <Box>
              <DetailSection label="Description" value={viewFeature.feat.description} />
              <DetailSection label="Business Rules" value={viewFeature.feat.business_rules} />
              <DetailSection label="Acceptance Criteria" value={viewFeature.feat.acceptance_criteria} />
              {!viewFeature.feat.description && !viewFeature.feat.business_rules && !viewFeature.feat.acceptance_criteria && (
                <Typography variant="body2" color="textSecondary" fontStyle="italic" mb={2}>
                  No details yet. Use AI Refine to enrich this feature.
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Stories ({viewFeature.feat.stories.length})
              </Typography>
              {viewFeature.feat.stories.map((story, si) => (
                <Box key={si} display="flex" alignItems="center" gap={1} mb={0.5} py={0.5}>
                  <Chip label={`${story.story_points}pts`} size="small" variant="outlined" />
                  <Typography variant="body2" flexGrow={1} noWrap>{story.title}</Typography>
                  <SyncBadge status={story.sync_status} />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setViewFeature(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── View: Story ──────────────────────────────────────────────────────── */}
      <Dialog open={!!viewStory} onClose={() => setViewStory(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="subtitle1" fontWeight={700}>{viewStory?.story.title}</Typography>
          <Box display="flex" gap={1} mt={0.5}>
            <SyncBadge status={viewStory?.story.sync_status ?? "new"} />
            {viewStory && <Chip label={`${viewStory.story.story_points} pts`} size="small" variant="outlined" />}
            {viewStory && <Chip label={PRIORITY_CONFIG[viewStory.story.priority]?.label ?? `P${viewStory.story.priority}`} color={PRIORITY_CONFIG[viewStory.story.priority]?.color ?? "default"} size="small" />}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewStory && (
            <Box>
              <DetailSection label="Description" value={viewStory.story.description} />
              <DetailSection label="Business Rules" value={viewStory.story.business_rules} />
              <DetailSection label="Acceptance Criteria" value={viewStory.story.acceptance_criteria} />
              {!viewStory.story.description && !viewStory.story.business_rules && !viewStory.story.acceptance_criteria && (
                <Typography variant="body2" color="textSecondary" fontStyle="italic">
                  No details yet. Use AI Refine to enrich this story.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setViewStory(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Refine Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!refineTarget} onClose={() => setRefineTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconSparkles size={20} />
            AI Refine {refineTarget?.type === "epic" ? "Epic" : refineTarget?.type === "feature" ? "Feature" : "Story"}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              {refineTarget?.type === "story" ? refineTarget?.title : refineTarget?.name}
            </Typography>
            {refineTarget?.description ? (
              <Box mb={1.5}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                  Current Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {refineTarget.description}
                </Typography>
              </Box>
            ) : null}
            {refineTarget?.type !== "epic" && refineTarget?.business_rules ? (
              <Box mb={1.5}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                  Business Rules
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {refineTarget.business_rules}
                </Typography>
              </Box>
            ) : null}
            {refineTarget?.type !== "epic" && refineTarget?.acceptance_criteria ? (
              <Box mb={1.5}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} display="block" mb={0.5}>
                  Acceptance Criteria
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {refineTarget.acceptance_criteria}
                </Typography>
              </Box>
            ) : null}
            {!refineTarget?.description && !refineTarget?.business_rules && !refineTarget?.acceptance_criteria && (
              <Typography variant="body2" color="textSecondary" fontStyle="italic">
                No details yet — AI will generate them from scratch.
              </Typography>
            )}
          </Paper>
          <Typography variant="body2" color="textSecondary" mb={2}>
            {refineTarget?.type === "epic"
              ? "AI will enrich this epic with a detailed description of its scope and goals."
              : "AI will enrich this item with a detailed description, specific business rules, and testable acceptance criteria."}
          </Typography>
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
            placeholder="e.g. Focus on security aspects, PCI compliance required, must support mobile..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRefineTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              refineMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <IconSparkles size={16} />
            }
            disabled={refineMutation.isPending || !refineTarget}
            onClick={() => {
              if (!refineTarget) return;
              refineMutation.mutate({
                item_type: refineTarget.type,
                name: refineTarget.name,
                title: refineTarget.title,
                description: refineTarget.description,
                business_rules: refineTarget.business_rules,
                acceptance_criteria: refineTarget.acceptance_criteria,
                context: refineContext || undefined,
                config_id: refineConfigId || undefined,
              });
            }}
          >
            {refineMutation.isPending ? "Refining..." : "Refine with AI"}
          </Button>
        </DialogActions>
      </Dialog>

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
