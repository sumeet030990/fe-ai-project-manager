import axiosInstance from "@/lib/axios";
import { PaginatedResponse, PromptCreate, PromptResponse } from "@/types";

export const getPrompts = async (
  featureId: string,
  storyId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<PromptResponse>> => {
  const { data } = await axiosInstance.get(
    `/features/${featureId}/stories/${storyId}/prompts`,
    { params: { page, size } }
  );
  return data;
};

export const savePrompt = async (
  featureId: string,
  storyId: string,
  payload: PromptCreate
): Promise<PromptResponse> => {
  const { data } = await axiosInstance.post(
    `/features/${featureId}/stories/${storyId}/prompts`,
    payload
  );
  return data;
};
