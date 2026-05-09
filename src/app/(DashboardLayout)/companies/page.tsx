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
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "@/services/companies";
import { CompanyCreate, CompanyResponse, CompanyUpdate } from "@/types";
import CompanyFormModal from "./CompanyFormModal";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyResponse | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<CompanyResponse | null>(
    null
  );
  const [snack, setSnack] = useState<Snack>({
    open: false,
    message: "",
    severity: "success",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", page, rowsPerPage],
    queryFn: () => getCompanies(page + 1, rowsPerPage),
  });

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setFormOpen(false);
      toast("Company created successfully", "success");
    },
    onError: () => toast("Failed to create company", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompanyUpdate }) =>
      updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setFormOpen(false);
      setEditingCompany(null);
      toast("Company updated successfully", "success");
    },
    onError: () => toast("Failed to update company", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setDeleteTarget(null);
      toast("Company deleted successfully", "success");
    },
    onError: () => toast("Failed to delete company", "error"),
  });

  const handleFormSubmit = (data: CompanyCreate | CompanyUpdate) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, payload: data as CompanyUpdate });
    } else {
      createMutation.mutate(data as CompanyCreate);
    }
  };

  const handleEdit = (company: CompanyResponse) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCompany(null);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer title="Companies" description="Manage companies">
      <DashboardCard
        title="Companies"
        action={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setEditingCompany(null);
              setFormOpen(true);
            }}
          >
            Add Company
          </Button>
        }
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Typography color="error" textAlign="center" py={4}>
            Failed to load companies. Make sure the backend is running on{" "}
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
                      <Typography variant="subtitle2">Email</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Phone</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">City</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Country</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Status</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary" py={2}>
                          No companies found. Click &quot;Add Company&quot; to
                          get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((company) => (
                      <TableRow key={company.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {company.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{company.email}</TableCell>
                        <TableCell>{company.phone}</TableCell>
                        <TableCell>{company.city}</TableCell>
                        <TableCell>{company.country}</TableCell>
                        <TableCell>
                          <Chip
                            label={company.is_active ? "Active" : "Inactive"}
                            color={company.is_active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(company)}
                          >
                            <IconPencil size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(company)}
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

      <CompanyFormModal
        open={formOpen}
        onClose={handleCloseForm}
        company={editingCompany}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Company</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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
