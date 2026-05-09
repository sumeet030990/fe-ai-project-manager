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
import { createUser, deleteUser, getUsers, updateUser } from "@/services/users";
import { UserCreate, UserResponse, UserUpdate } from "@/types";
import UserFormModal from "./UserFormModal";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

const getFullName = (user: UserResponse) =>
  [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ") || "—";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [snack, setSnack] = useState<Snack>({
    open: false,
    message: "",
    severity: "success",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, rowsPerPage],
    queryFn: () => getUsers(page + 1, rowsPerPage),
  });

  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      toast("User created successfully", "success");
    },
    onError: () => toast("Failed to create user", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdate }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      setEditingUser(null);
      toast("User updated successfully", "success");
    },
    onError: () => toast("Failed to update user", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
      toast("User deleted successfully", "success");
    },
    onError: () => toast("Failed to delete user", "error"),
  });

  const handleFormSubmit = (data: UserCreate | UserUpdate) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, payload: data as UserUpdate });
    } else {
      createMutation.mutate(data as UserCreate);
    }
  };

  const handleEdit = (user: UserResponse) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingUser(null);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer title="Users" description="Manage users">
      <DashboardCard
        title="Users"
        action={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            Add User
          </Button>
        }
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Typography color="error" textAlign="center" py={4}>
            Failed to load users. Make sure the backend is running on{" "}
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
                      <Typography variant="subtitle2">Contact</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Role</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Company</Typography>
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
                          No users found. Click &quot;Add User&quot; to get
                          started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {getFullName(user)}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.contact_no}</TableCell>
                        <TableCell>{user.role?.name ?? "—"}</TableCell>
                        <TableCell>{user.company?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? "Active" : "Inactive"}
                            color={user.is_active ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(user)}
                          >
                            <IconPencil size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(user)}
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

      <UserFormModal
        open={formOpen}
        onClose={handleCloseForm}
        user={editingUser}
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
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>
              {deleteTarget ? getFullName(deleteTarget) : ""}
            </strong>
            ? This action cannot be undone.
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
