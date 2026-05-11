import axiosInstance from "@/lib/axios";
import {
  ModuleCreate,
  ModuleResponse,
  ModuleUpdate,
  PaginatedResponse,
} from "@/types";

export const getModules = async (
  projectId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<ModuleResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/modules`, {
    params: { page, size },
  });
  return data;
};

export const getModule = async (
  projectId: string,
  moduleId: string
): Promise<ModuleResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/modules/${moduleId}`);
  return data;
};

export const createModule = async (
  projectId: string,
  payload: ModuleCreate
): Promise<ModuleResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/modules`, payload);
  return data;
};

export const updateModule = async (
  projectId: string,
  moduleId: string,
  payload: ModuleUpdate
): Promise<ModuleResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/modules/${moduleId}`,
    payload
  );
  return data;
};

export const deleteModule = async (projectId: string, moduleId: string, deleteRemote = false): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/modules/${moduleId}`, {
    params: { delete_remote: deleteRemote },
  });
};
