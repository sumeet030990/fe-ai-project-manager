import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  ProjectPluginCreate,
  ProjectPluginResponse,
  ProjectPluginUpdate,
} from "@/types";

export const getPlugins = async (
  projectId: string,
  techStackId: string,
  page = 1,
  size = 50
): Promise<PaginatedResponse<ProjectPluginResponse>> => {
  const { data } = await axiosInstance.get(
    `/projects/${projectId}/tech-stacks/${techStackId}/plugins`,
    { params: { page, size } }
  );
  return data;
};

export const getPlugin = async (
  projectId: string,
  pluginId: string
): Promise<ProjectPluginResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/plugins/${pluginId}`);
  return data;
};

export const createPlugin = async (
  projectId: string,
  payload: ProjectPluginCreate
): Promise<ProjectPluginResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/plugins`, payload);
  return data;
};

export const updatePlugin = async (
  projectId: string,
  pluginId: string,
  payload: ProjectPluginUpdate
): Promise<ProjectPluginResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/plugins/${pluginId}`,
    payload
  );
  return data;
};

export const deletePlugin = async (projectId: string, pluginId: string): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/plugins/${pluginId}`);
};
