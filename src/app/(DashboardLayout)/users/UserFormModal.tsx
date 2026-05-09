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
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/services/roles";
import { getCompanies } from "@/services/companies";
import { UserCreate, UserResponse, UserUpdate } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  user?: UserResponse | null;
  onSubmit: (data: UserCreate | UserUpdate) => void;
  isSubmitting: boolean;
}

const emptyForm = {
  email: "",
  contact_no: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  dob: "",
  password: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  role_id: "",
  company_id: "",
  is_active: true,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function UserFormModal({
  open,
  onClose,
  user,
  onSubmit,
  isSubmitting,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEdit = !!user;

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: open,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-dropdown"],
    queryFn: () => getCompanies(1, 100),
    enabled: open,
  });

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        contact_no: user.contact_no,
        first_name: user.first_name ?? "",
        middle_name: user.middle_name ?? "",
        last_name: user.last_name ?? "",
        dob: user.dob ?? "",
        password: "",
        address_line_1: user.address_line_1 ?? "",
        address_line_2: user.address_line_2 ?? "",
        city: user.city ?? "",
        state: user.state ?? "",
        country: user.country ?? "",
        pincode: user.pincode ?? "",
        role_id: user.role_id,
        company_id: user.company_id ?? "",
        is_active: user.is_active,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [user, open]);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const setSelect =
    (field: keyof FormState) => (e: SelectChangeEvent<string>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.email.trim()) next.email = "Required";
    if (!form.contact_no.trim()) next.contact_no = "Required";
    if (!form.role_id) next.role_id = "Required";
    if (!isEdit) {
      if (!form.password.trim()) next.password = "Required";
      else if (form.password.length < 8)
        next.password = "Minimum 8 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEdit) {
      const payload: UserUpdate = {
        first_name: form.first_name || undefined,
        middle_name: form.middle_name || undefined,
        last_name: form.last_name || undefined,
        dob: form.dob || undefined,
        address_line_1: form.address_line_1 || undefined,
        address_line_2: form.address_line_2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        pincode: form.pincode || undefined,
        role_id: form.role_id,
        company_id: form.company_id || undefined,
        is_active: form.is_active,
      };
      onSubmit(payload);
    } else {
      const payload: UserCreate = {
        email: form.email,
        contact_no: form.contact_no,
        password: form.password,
        role_id: form.role_id,
        first_name: form.first_name || undefined,
        middle_name: form.middle_name || undefined,
        last_name: form.last_name || undefined,
        dob: form.dob || undefined,
        address_line_1: form.address_line_1 || undefined,
        address_line_2: form.address_line_2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        pincode: form.pincode || undefined,
        company_id: form.company_id || undefined,
      };
      onSubmit(payload);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* Personal Information */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Personal Information
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="First Name"
              fullWidth
              value={form.first_name}
              onChange={set("first_name")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Middle Name"
              fullWidth
              value={form.middle_name}
              onChange={set("middle_name")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Last Name"
              fullWidth
              value={form.last_name}
              onChange={set("last_name")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Email"
              fullWidth
              required
              value={form.email}
              onChange={set("email")}
              error={!!errors.email}
              helperText={errors.email}
              disabled={isEdit}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Contact No."
              fullWidth
              required
              value={form.contact_no}
              onChange={set("contact_no")}
              error={!!errors.contact_no}
              helperText={errors.contact_no}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Date of Birth"
              fullWidth
              type="date"
              value={form.dob}
              onChange={set("dob")}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          {!isEdit && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Password"
                fullWidth
                required
                type="password"
                value={form.password}
                onChange={set("password")}
                error={!!errors.password}
                helperText={errors.password}
              />
            </Grid>
          )}

          {/* Account Settings */}
          <Grid size={12}>
            <Divider>
              <Typography variant="caption" color="textSecondary">
                Account Settings
              </Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required error={!!errors.role_id}>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                value={form.role_id}
                label="Role"
                onChange={setSelect("role_id")}
              >
                {rolesData?.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.role_id && (
                <FormHelperText>{errors.role_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel id="company-label">Company</InputLabel>
              <Select
                labelId="company-label"
                value={form.company_id}
                label="Company"
                onChange={setSelect("company_id")}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {companiesData?.items.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {isEdit && (
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
          )}

          {/* Address (Optional) */}
          <Grid size={12}>
            <Divider>
              <Typography variant="caption" color="textSecondary">
                Address (Optional)
              </Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Address Line 1"
              fullWidth
              value={form.address_line_1}
              onChange={set("address_line_1")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Address Line 2"
              fullWidth
              value={form.address_line_2}
              onChange={set("address_line_2")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="City"
              fullWidth
              value={form.city}
              onChange={set("city")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="State"
              fullWidth
              value={form.state}
              onChange={set("state")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Country"
              fullWidth
              value={form.country}
              onChange={set("country")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Pincode"
              fullWidth
              value={form.pincode}
              onChange={set("pincode")}
            />
          </Grid>
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
        >
          {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
