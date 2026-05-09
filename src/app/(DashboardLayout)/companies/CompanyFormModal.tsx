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
} from "@mui/material";
import { CompanyCreate, CompanyResponse, CompanyUpdate } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  company?: CompanyResponse | null;
  onSubmit: (data: CompanyCreate | CompanyUpdate) => void;
  isSubmitting: boolean;
}

const emptyForm = {
  name: "",
  gst_no: "",
  email: "",
  phone: "",
  website: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  is_active: true,
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function CompanyFormModal({
  open,
  onClose,
  company,
  onSubmit,
  isSubmitting,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEdit = !!company;

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        gst_no: company.gst_no ?? "",
        email: company.email,
        phone: company.phone,
        website: company.website ?? "",
        address_line_1: company.address_line_1,
        address_line_2: company.address_line_2 ?? "",
        city: company.city,
        state: company.state,
        country: company.country,
        pincode: company.pincode,
        is_active: company.is_active,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [company, open]);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.email.trim()) next.email = "Required";
    if (!form.phone.trim()) next.phone = "Required";
    if (!form.address_line_1.trim()) next.address_line_1 = "Required";
    if (!form.city.trim()) next.city = "Required";
    if (!form.state.trim()) next.state = "Required";
    if (!form.country.trim()) next.country = "Required";
    if (!form.pincode.trim()) next.pincode = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: CompanyCreate | CompanyUpdate = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address_line_1: form.address_line_1,
      city: form.city,
      state: form.state,
      country: form.country,
      pincode: form.pincode,
      ...(form.gst_no && { gst_no: form.gst_no }),
      ...(form.website && { website: form.website }),
      ...(form.address_line_2 && { address_line_2: form.address_line_2 }),
      ...(isEdit && { is_active: form.is_active }),
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Basic Information
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Company Name"
              fullWidth
              required
              value={form.name}
              onChange={set("name")}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="GST No."
              fullWidth
              value={form.gst_no}
              onChange={set("gst_no")}
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
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Phone"
              fullWidth
              required
              value={form.phone}
              onChange={set("phone")}
              error={!!errors.phone}
              helperText={errors.phone}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Website"
              fullWidth
              value={form.website}
              onChange={set("website")}
            />
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

          <Grid size={12}>
            <Divider>
              <Typography variant="caption" color="textSecondary">
                Address
              </Typography>
            </Divider>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Address Line 1"
              fullWidth
              required
              value={form.address_line_1}
              onChange={set("address_line_1")}
              error={!!errors.address_line_1}
              helperText={errors.address_line_1}
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
              required
              value={form.city}
              onChange={set("city")}
              error={!!errors.city}
              helperText={errors.city}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="State"
              fullWidth
              required
              value={form.state}
              onChange={set("state")}
              error={!!errors.state}
              helperText={errors.state}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Country"
              fullWidth
              required
              value={form.country}
              onChange={set("country")}
              error={!!errors.country}
              helperText={errors.country}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Pincode"
              fullWidth
              required
              value={form.pincode}
              onChange={set("pincode")}
              error={!!errors.pincode}
              helperText={errors.pincode}
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
