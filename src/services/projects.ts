import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  ProjectCreate,
  ProjectResponse,
  ProjectUpdate,
  UserResponse,
} from "@/types";

export const getProjects = async (
  page = 1,
  size = 10,
  company_id?: string
): Promise<PaginatedResponse<ProjectResponse>> => {
  const { data } = await axiosInstance.get("/projects", {
    params: { page, size, ...(company_id && { company_id }) },
  });
  return data;
};

export const getProject = async (id: string): Promise<ProjectResponse> => {
  const { data } = await axiosInstance.get(`/projects/${id}`);
  return data;
};

export const createProject = async (payload: ProjectCreate): Promise<ProjectResponse> => {
  const { data } = await axiosInstance.post("/projects", payload);
  return data;
};

export const updateProject = async (
  id: string,
  payload: ProjectUpdate
): Promise<ProjectResponse> => {
  const { data } = await axiosInstance.patch(`/projects/${id}`, payload);
  return data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/projects/${id}`);
};

export const getProjectUsers = async (
  projectId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<UserResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/users`, {
    params: { page, size },
  });
  return data;
};
