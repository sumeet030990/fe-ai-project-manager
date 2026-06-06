import axiosInstance from "@/lib/axios";
import { JiraSyncResult, JiraUserPreview, JiraUserSyncRequest, JiraUserSyncResult, StoryResponse } from "@/types";

export const syncStoriesFromJira = async (featureId: string): Promise<JiraSyncResult> => {
  const { data } = await axiosInstance.post(`/features/${featureId}/stories/jira/sync`);
  return data;
};

export const createStoryInJira = async (featureId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/features/${featureId}/stories/${storyId}/jira`);
  return data;
};

export const updateStoryInJira = async (featureId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.put(`/features/${featureId}/stories/${storyId}/jira`);
  return data;
};

export const deleteStoryFromJira = async (featureId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.delete(`/features/${featureId}/stories/${storyId}/jira`);
  return data;
};

export const pullStoryFromJira = async (featureId: string, storyId: string): Promise<StoryResponse> => {
  const { data } = await axiosInstance.post(`/features/${featureId}/stories/${storyId}/jira/pull`);
  return data;
};

export const previewJiraUsers = async (projectId: string): Promise<JiraUserPreview[]> => {
  const { data } = await axiosInstance.get("/jira/users/preview", { params: { project_id: projectId } });
  return data;
};

export const syncUsersFromJira = async (payload: JiraUserSyncRequest): Promise<JiraUserSyncResult> => {
  const { data } = await axiosInstance.post("/jira/users/sync", payload);
  return data;
};
