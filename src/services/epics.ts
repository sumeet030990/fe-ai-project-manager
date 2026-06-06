import axiosInstance from "@/lib/axios";
import {
  EpicCreate,
  EpicResponse,
  EpicUpdate,
  PaginatedResponse,
} from "@/types";

export const getEpics = async (
  projectId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<EpicResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/epics`, {
    params: { page, size },
  });
  return data;
};

export const getEpic = async (
  projectId: string,
  epicId: string
): Promise<EpicResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/epics/${epicId}`);
  return data;
};

export const createEpic = async (
  projectId: string,
  payload: EpicCreate
): Promise<EpicResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/epics`, payload);
  return data;
};

export const updateEpic = async (
  projectId: string,
  epicId: string,
  payload: EpicUpdate
): Promise<EpicResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/epics/${epicId}`,
    payload
  );
  return data;
};

export const deleteEpic = async (projectId: string, epicId: string): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/epics/${epicId}`);
};
