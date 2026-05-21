import axiosInstance from "@/lib/axios";
import {
  ActiveSprintResponse,
  BacklogResponse,
  SprintAIPlanRequest,
  SprintAIPlanResult,
  SprintCreate,
  SprintResponse,
  SprintStoriesRequest,
  SprintSyncResult,
  SprintUpdate,
  StoryResponse,
} from "@/types";

export const getSprints = async (projectId: string): Promise<SprintResponse[]> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/sprints`);
  return data;
};

export const createSprint = async (
  projectId: string,
  payload: SprintCreate
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/sprints`, payload);
  return data;
};

export const updateSprint = async (
  projectId: string,
  sprintId: string,
  payload: SprintUpdate
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/sprints/${sprintId}`,
    payload
  );
  return data;
};

export const deleteSprint = async (
  projectId: string,
  sprintId: string
): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/sprints/${sprintId}`);
};

export const startSprint = async (
  projectId: string,
  sprintId: string
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/sprints/${sprintId}/start`
  );
  return data;
};

export const completeSprint = async (
  projectId: string,
  sprintId: string
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/sprints/${sprintId}/complete`
  );
  return data;
};

export const getBacklog = async (projectId: string): Promise<BacklogResponse> => {
  const { data } = await axiosInstance.get(
    `/projects/${projectId}/sprints/board/backlog`
  );
  return data;
};

export const getActiveSprintBoard = async (
  projectId: string
): Promise<ActiveSprintResponse> => {
  const { data } = await axiosInstance.get(
    `/projects/${projectId}/sprints/board/active`
  );
  return data;
};

export const addStoriesToSprint = async (
  projectId: string,
  sprintId: string,
  payload: SprintStoriesRequest
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/sprints/${sprintId}/stories`,
    payload
  );
  return data;
};

export const removeStoriesFromSprint = async (
  projectId: string,
  sprintId: string,
  payload: SprintStoriesRequest
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.delete(
    `/projects/${projectId}/sprints/${sprintId}/stories`,
    { data: payload }
  );
  return data;
};

export const getSprintStories = async (
  projectId: string,
  sprintId: string
): Promise<StoryResponse[]> => {
  const { data } = await axiosInstance.get(
    `/projects/${projectId}/sprints/${sprintId}/stories`
  );
  return data;
};

export const syncSprintsFromJira = async (
  projectId: string
): Promise<SprintSyncResult> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/sprints/sync`);
  return data;
};

export const pushSprintToJira = async (
  projectId: string,
  sprintId: string
): Promise<SprintResponse> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/sprints/${sprintId}/push-to-jira`
  );
  return data;
};

export const aiPlanSprint = async (
  projectId: string,
  sprintId: string,
  payload: SprintAIPlanRequest
): Promise<SprintAIPlanResult> => {
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/sprints/${sprintId}/ai-plan`,
    payload
  );
  return data;
};
