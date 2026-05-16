"use client";
import React, { useState } from "react";
import {
  Alert,
  Autocomplete,
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
  TextField,
  Typography,
} from "@mui/material";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addProjectUsers, getProjectUsers, removeProjectUser } from "@/services/projects";
import { getUsers } from "@/services/users";
import { UserResponse } from "@/types";

type Snack = { open: boolean; message: string; severity: "success" | "error" };

function userLabel(u: UserResponse): string {
  return u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.email;
}

export default function TeamTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResponse[]>([]);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [snack, setSnack] = useState<Snack>({ open: false, message: "", severity: "success" });
  const toast = (message: string, severity: "success" | "error") =>
    setSnack({ open: true, message, severity });

  const { data, isLoading } = useQuery({
    queryKey: ["project-users", projectId, page],
    queryFn: () => getProjectUsers(projectId, page + 1, 20),
  });

  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => getUsers(1, 100),
  });

  const memberIds = new Set(data?.items.map((u: UserResponse) => u.id) ?? []);
  const availableUsers =
    allUsersData?.items.filter((u: UserResponse) => !memberIds.has(u.id)) ?? [];

  const addMutation = useMutation({
    mutationFn: (userIds: string[]) => addProjectUsers(projectId, userIds),
    onSuccess: (_, userIds) => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      setAddOpen(false);
      setSelectedUsers([]);
      toast(
        userIds.length === 1
          ? "Team member added"
          : `${userIds.length} team members added`,
        "success"
      );
    },
    onError: () => toast("Failed to add team members", "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProjectUser(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-users", projectId] });
      setRemoveTarget(null);
      toast("Team member removed", "success");
    },
    onError: () => toast("Failed to remove team member", "error"),
  });

  const handleClose = () => {
    setAddOpen(false);
    setSelectedUsers([]);
  };

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => setAddOpen(true)}
        >
          Add Member
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><Typography variant="subtitle2">Name</Typography></TableCell>
              <TableCell><Typography variant="subtitle2">Email</Typography></TableCell>
              <TableCell><Typography variant="subtitle2">Role</Typography></TableCell>
              <TableCell><Typography variant="subtitle2">Company</Typography></TableCell>
              <TableCell><Typography variant="subtitle2">Status</Typography></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary" py={2}>
                    No team members assigned to this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user: UserResponse) => {
                const displayName = userLabel(user);
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {user.first_name
                          ? `${user.first_name} ${user.last_name ?? ""}`.trim()
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
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
                        color="error"
                        onClick={() => setRemoveTarget({ id: user.id, name: displayName })}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {(data?.total ?? 0) > 20 && (
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={20}
          onRowsPerPageChange={() => {}}
          rowsPerPageOptions={[20]}
        />
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Members</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            sx={{ mt: 1 }}
            options={availableUsers}
            loading={isLoadingUsers}
            value={selectedUsers}
            onChange={(_, value) => setSelectedUsers(value)}
            getOptionLabel={(u) => userLabel(u)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={(options, { inputValue }) => {
              const q = inputValue.toLowerCase();
              return options.filter(
                (u) =>
                  userLabel(u).toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q)
              );
            }}
            renderTags={(selected, getTagProps) =>
              selected.map((u, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} label={userLabel(u)} size="small" {...tagProps} />;
              })
            }
            renderOption={(props, u) => (
              <li {...props} key={u.id}>
                <Box>
                  <Typography variant="body2">{userLabel(u)}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {u.email}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search and select users"
                placeholder="Type to search…"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingUsers && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            noOptionsText={
              isLoadingUsers ? "Loading users…" : "No users available"
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={selectedUsers.length === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate(selectedUsers.map((u) => u.id))}
          >
            {addMutation.isPending
              ? "Adding…"
              : selectedUsers.length > 1
              ? `Add ${selectedUsers.length} Members`
              : "Add Member"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{removeTarget?.name}</strong> from this project?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={removeMutation.isPending}
            onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
          >
            {removeMutation.isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
