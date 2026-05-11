import axiosInstance from "@/lib/axios";
import { JiraSyncResult, StoryResponse } from "@/types";

export const syncStoriesFromJira = async (moduleId: string): Promise<JiraSyncResult> => {
  const { data } = await axiosInstance.post(`/modules/${moduleId}/stories/jira/sync`);
  return data;
};

export const createStoryInJira = async (moduleId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/modules/${moduleId}/stories/${storyId}/jira`);
  return data;
};

export const updateStoryInJira = async (moduleId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.put(`/modules/${moduleId}/stories/${storyId}/jira`);
  return data;
};

export const deleteStoryFromJira = async (moduleId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.delete(`/modules/${moduleId}/stories/${storyId}/jira`);
  return data;
};

export const pullStoryFromJira = async (moduleId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/modules/${moduleId}/stories/${storyId}/jira/pull`);
  return data;
};
