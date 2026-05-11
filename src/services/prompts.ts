import axiosInstance from "@/lib/axios";
import { PaginatedResponse, PromptCreate, PromptResponse } from "@/types";

export const getPrompts = async (
  moduleId: string,
  storyId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<PromptResponse>> => {
  const { data } = await axiosInstance.get(
    `/modules/${moduleId}/stories/${storyId}/prompts`,
    { params: { page, size } }
  );
  return data;
};

export const savePrompt = async (
  moduleId: string,
  storyId: string,
  payload: PromptCreate
): Promise<PromptResponse> => {
  const { data } = await axiosInstance.post(
    `/modules/${moduleId}/stories/${storyId}/prompts`,
    payload
  );
  return data;
};
