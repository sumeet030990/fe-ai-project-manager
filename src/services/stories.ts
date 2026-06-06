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
  featureId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<StoryResponse>> => {
  const { data } = await axiosInstance.get(`/features/${featureId}/stories`, {
    params: { page, size },
  });
  return data;
};

export const getStory = async (
  featureId: string,
  storyId: string
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.get(`/features/${featureId}/stories/${storyId}`);
  return data;
};

export const createStory = async (
  featureId: string,
  payload: StoryCreate
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/features/${featureId}/stories`, payload);
  return data;
};

export const updateStory = async (
  featureId: string,
  storyId: string,
  payload: StoryUpdate
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.patch(
    `/features/${featureId}/stories/${storyId}`,
    payload
  );
  return data;
};

export const deleteStory = async (featureId: string, storyId: string, deleteRemote = false): Promise<void> => {
  await axiosInstance.delete(`/features/${featureId}/stories/${storyId}`, {
    params: { delete_remote: deleteRemote },
  });
};

export const generateStories = async (
  featureId: string,
  payload: StoryGenerateRequest = {}
): Promise<StoryResponse[]> => {
  const { data } = await axiosInstance.post(
    `/features/${featureId}/generate-stories`,
    payload
  );
  return data;
};

export const refineStory = async (
  featureId: string,
  storyId: string,
  payload: StoryRefineRequest = {}
): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(
    `/features/${featureId}/stories/${storyId}/refine`,
    payload
  );
  return data;
};
