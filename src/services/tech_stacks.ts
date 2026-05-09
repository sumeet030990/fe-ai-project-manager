import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  ProjectTechStackCreate,
  ProjectTechStackResponse,
  ProjectTechStackUpdate,
} from "@/types";

export const getTechStacks = async (
  projectId: string,
  page = 1,
  size = 50
): Promise<PaginatedResponse<ProjectTechStackResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/tech-stacks`, {
    params: { page, size },
  });
  return data;
};

export const getTechStack = async (
  projectId: string,
  stackId: string
): Promise<ProjectTechStackResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/tech-stacks/${stackId}`);
  return data;
};

export const createTechStack = async (
  projectId: string,
  payload: ProjectTechStackCreate
): Promise<ProjectTechStackResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/tech-stacks`, payload);
  return data;
};

export const updateTechStack = async (
  projectId: string,
  stackId: string,
  payload: ProjectTechStackUpdate
): Promise<ProjectTechStackResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/tech-stacks/${stackId}`,
    payload
  );
  return data;
};

export const deleteTechStack = async (projectId: string, stackId: string): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/tech-stacks/${stackId}`);
};
