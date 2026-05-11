import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  StoryCreate,
  StoryGenerateRequest,
  StoryRefineRequest,
  StoryResponse,
  StoryUpdate,
} from "@/types";

export const getStories = async (
  moduleId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<StoryResponse>> => {
  const { data } = await axiosInstance.get(`/modules/${moduleId}/stories`, {
    params: { page, size },
  });
  return data;
};

export const getStory = async (
  moduleId: string,
  storyId: string
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.get(`/modules/${moduleId}/stories/${storyId}`);
  return data;
};

export const createStory = async (
  moduleId: string,
  payload: StoryCreate
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/modules/${moduleId}/stories`, payload);
  return data;
};

export const updateStory = async (
  moduleId: string,
  storyId: string,
  payload: StoryUpdate
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.patch(
    `/modules/${moduleId}/stories/${storyId}`,
    payload
  );
  return data;
};

export const deleteStory = async (moduleId: string, storyId: string, deleteRemote = false): Promise<void> => {
  await axiosInstance.delete(`/modules/${moduleId}/stories/${storyId}`, {
    params: { delete_remote: deleteRemote },
  });
};

export const generateStories = async (
  projectId: string,
  moduleId: string,
  payload: StoryGenerateRequest = {}
): Promise<StoryResponse[]> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/modules/${moduleId}/generate-stories`,
    payload
  );
  return data;
};

export const refineStory = async (
  moduleId: string,
  storyId: string,
  payload: StoryRefineRequest = {}
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(
    `/modules/${moduleId}/stories/${storyId}/refine`,
    payload
  );
  return data;
};
