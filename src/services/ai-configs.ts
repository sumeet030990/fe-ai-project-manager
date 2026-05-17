import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  ProjectAIConfigCreate,
  ProjectAIConfigResponse,
  ProjectAIConfigUpdate,
} from "@/types";

export const getAIConfigs = async (
  projectId: string,
  page = 1,
  size = 50
): Promise<PaginatedResponse<ProjectAIConfigResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/ai-configs`, {
    params: { page, size },
  });
  return data;
};

export const getAIConfig = async (
  projectId: string,
  configId: string
): Promise<ProjectAIConfigResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/ai-configs/${configId}`);
  return data;
};

export const createAIConfig = async (
  projectId: string,
  payload: ProjectAIConfigCreate
): Promise<ProjectAIConfigResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/ai-configs`, payload);
  return data;
};

export const updateAIConfig = async (
  projectId: string,
  configId: string,
  payload: ProjectAIConfigUpdate
): Promise<ProjectAIConfigResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/ai-configs/${configId}`,
    payload
  );
  return data;
};

export const deleteAIConfig = async (projectId: string, configId: string): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/ai-configs/${configId}`);
};
