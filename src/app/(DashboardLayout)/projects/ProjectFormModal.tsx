"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getCompanies } from "@/services/companies";
import { getUsers } from "@/services/users";
import { ProjectCreate, ProjectResponse, ProjectUpdate } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  project?: ProjectResponse | null;
  onSubmit: (data: ProjectCreate | ProjectUpdate) => void;
  isSubmitting: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  project_info: "",
  jira_project_key: "",
  company_id: "",
  created_by: "",
  status: "active",
  is_active: true,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function ProjectFormModal({
  open,
  onClose,
  project,
  onSubmit,
  isSubmitting,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEdit = !!project;

  const { data: companiesData } = useQuery({
    queryKey: ["companies-all"],
    queryFn: () => getCompanies(1, 100),
    enabled: open,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(1, 100),
    enabled: open,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description ?? "",
        project_info: project.project_info ?? "",
        jira_project_key: project.jira_project_key ?? "",
        company_id: project.company_id,
        created_by: project.created_by,
        status: project.status,
        is_active: project.is_active,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [project, open]);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.company_id) next.company_id = "Required";
    if (!isEdit && !form.created_by) next.created_by = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit) {
      const payload: ProjectUpdate = {
        name: form.name,
        status: form.status,
        is_active: form.is_active,
        ...(form.description && { description: form.description }),
        ...(form.project_info && { project_info: form.project_info }),
        jira_project_key: form.jira_project_key || undefined,
      };
      onSubmit(payload);
    } else {
      const payload: ProjectCreate = {
        name: form.name,
        company_id: form.company_id,
        created_by: form.created_by,
        ...(form.description && { description: form.description }),
        ...(form.project_info && { project_info: form.project_info }),
        jira_project_key: form.jira_project_key || undefined,
      };
      onSubmit(payload);
    }
  };

  const PROJECT_STATUSES = ["active", "inactive", "archived"];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Project" : "Add Project"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField
              label="Project Name"
              fullWidth
              required
              value={form.name}
              onChange={set("name")}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={set("description")}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              label="Project Info"
              fullWidth
              multiline
              rows={3}
              value={form.project_info}
              onChange={set("project_info")}
              helperText="Additional context used for AI story generation"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="JIRA Project Key"
              fullWidth
              value={form.jira_project_key}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  jira_project_key: e.target.value.toUpperCase(),
                }))
              }
              helperText="e.g. SCRUM, PM — used to sync stories with JIRA"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required error={!!errors.company_id}>
              <InputLabel>Company</InputLabel>
              <Select
                value={form.company_id}
                label="Company"
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, company_id: e.target.value }));
                  if (errors.company_id)
                    setErrors((prev) => ({ ...prev, company_id: "" }));
                }}
              >
                {companiesData?.items.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {!isEdit && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required error={!!errors.created_by}>
                <InputLabel>Created By</InputLabel>
                <Select
                  value={form.created_by}
                  label="Created By"
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, created_by: e.target.value }));
                    if (errors.created_by)
                      setErrors((prev) => ({ ...prev, created_by: "" }));
                  }}
                >
                  {usersData?.items.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.first_name
                        ? `${u.first_name} ${u.last_name ?? ""}`.trim()
                        : u.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {isEdit && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={form.status}
                    label="Status"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid
                size={{ xs: 12, sm: 6 }}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Active"
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
