export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RoleResponse {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  gst_no?: string;
  email: string;
  phone: string;
  website?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  gst_no?: string;
  email: string;
  phone: string;
  website?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface CompanyUpdate {
  name?: string;
  gst_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  contact_no: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  is_active: boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id: string;
  role: RoleResponse;
  company_id?: string;
  company?: CompanyResponse;
  jira_account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type AIProvider = "claude" | "openai" | "groq" | "deepseek" | "other";

export interface ProjectAIConfigResponse {
  id: string;
  project_id: string;
  provider: AIProvider;
  api_key_masked: string;
  model_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAIConfigCreate {
  provider: AIProvider;
  api_key: string;
  model_name: string;
  is_default: boolean;
}

export interface ProjectAIConfigUpdate {
  provider?: AIProvider;
  api_key?: string;
  model_name?: string;
  is_default?: boolean;
}

export type JiraMatchStatus = "already_linked" | "email_match" | "new";

export interface JiraUserPreview {
  account_id: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  active: boolean;
  match_status: JiraMatchStatus;
  local_user_id?: string | null;
}

export interface JiraUserSyncRequest {
  project_id: string;
  account_ids: string[];
  role_id: string;
}

export interface JiraUserSyncFailure {
  account_id: string;
  display_name: string;
  error: string;
}

export interface JiraUserSyncResult {
  linked: UserResponse[];
  created: UserResponse[];
  failed: JiraUserSyncFailure[];
}

export interface UserCreate {
  email: string;
  contact_no: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  password: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id: string;
  company_id?: string;
}

export interface UserUpdate {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  is_active?: boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id?: string;
  company_id?: string;
}

// Project
export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  project_info?: string;
  jira_project_key?: string;
  jira_board_id?: number | null;
  status: string;
  is_active: boolean;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  project_info?: string;
  jira_project_key?: string;
  jira_board_id?: number;
  company_id: string;
  created_by: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  project_info?: string;
  jira_project_key?: string;
  jira_board_id?: number | null;
  status?: string;
  is_active?: boolean;
}

// Tech Stack
export type TechStackCategory = "frontend" | "backend" | "database" | "devops" | "mobile" | "other";

export interface ProjectTechStackResponse {
  id: string;
  project_id: string;
  name: string;
  version?: string;
  category: TechStackCategory;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTechStackCreate {
  name: string;
  version?: string;
  category: TechStackCategory;
  description?: string;
}

export interface ProjectTechStackUpdate {
  name?: string;
  version?: string;
  category?: TechStackCategory;
  description?: string;
}

// Plugin
export type PluginEcosystem = "npm" | "pip" | "maven" | "composer" | "gem" | "nuget" | "cargo" | "other";

export interface ProjectPluginResponse {
  id: string;
  project_id: string;
  tech_stack_id: string;
  name: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPluginCreate {
  tech_stack_id: string;
  name: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
}

export interface ProjectPluginUpdate {
  name?: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
}

// Feature
export type FeatureStatus = "draft" | "ready" | "in_progress" | "done";

export interface FeatureResponse {
  id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  order: number;
  status: FeatureStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureCreate {
  name: string;
  description?: string;
  order?: number;
  status?: FeatureStatus;
  priority?: number;
  created_by: string;
}

export interface FeatureUpdate {
  name?: string;
  description?: string;
  order?: number;
  status?: FeatureStatus;
  priority?: number;
}

// Story
export type StoryStatus = "draft" | "review" | "approved" | "rejected" | "in_progress" | "done";

export interface StoryAssignee {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

export interface StoryResponse {
  id: string;
  feature_id: string;
  title: string;
  description?: string;
  order: number;
  status: StoryStatus;
  priority: number;
  story_points?: number;
  is_ai_generated: boolean;
  azure_work_item_id?: number;
  jira_issue_key?: string;
  assignee_id?: string | null;
  assignee?: StoryAssignee | null;
  business_rules?: string;
  acceptance_criteria?: string;
  file_references?: string;
  urls?: string;
  created_at: string;
  updated_at: string;
}

export interface JiraSyncFailure {
  jira_key: string;
  title: string;
  error: string;
}

export interface JiraSyncResult {
  fetched: number;
  imported: StoryResponse[];
  updated: StoryResponse[];
  skipped: number;
  failed: JiraSyncFailure[];
  users_linked: UserResponse[];
}


export interface StoryCreate {
  title: string;
  description?: string;
  order?: number;
  status?: StoryStatus;
  priority?: number;
  story_points?: number;
}

export interface StoryUpdate {
  title?: string;
  description?: string;
  order?: number;
  status?: StoryStatus;
  priority?: number;
  story_points?: number;
  business_rules?: string;
  acceptance_criteria?: string;
  file_references?: string;
  urls?: string;
}

export interface StoryGenerateRequest {
  context?: string;
  config_id?: string;
}

export interface StoryRefineRequest {
  context?: string;
  config_id?: string;
}

// Test Case
export type TestCaseType = "positive" | "negative";

export interface TestCaseResponse {
  id: string;
  story_id: string;
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type: TestCaseType;
  order: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCaseCreate {
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  order?: number;
}

export interface TestCaseUpdate {
  title?: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  order?: number;
}

export interface TestCaseGenerateRequest {
  context?: string;
  config_id?: string;
}

// Sprint
export type SprintStatus = "planning" | "active" | "completed";

export interface SprintResponse {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: SprintStatus;
  jira_sprint_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SprintCreate {
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

export interface SprintUpdate {
  name?: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status?: SprintStatus;
}

export interface SprintStoriesRequest {
  story_ids: string[];
}

export interface BacklogFeatureGroup {
  feature_id: string;
  feature_name: string;
  jira_epic_key?: string | null;
  stories: StoryResponse[];
}

export interface BacklogResponse {
  features: BacklogFeatureGroup[];
  total_stories: number;
  total_points: number;
}

export interface SprintBoardColumns {
  todo: StoryResponse[];
  in_progress: StoryResponse[];
  in_review: StoryResponse[];
  done: StoryResponse[];
}

export interface ActiveSprintResponse {
  sprint: SprintResponse;
  columns: SprintBoardColumns;
  total_points: number;
  completed_points: number;
}

export interface SprintSyncFailure {
  jira_sprint_id: number;
  name: string;
  error: string;
}

export interface SprintSyncResult {
  fetched: number;
  created: SprintResponse[];
  updated: SprintResponse[];
  failed: SprintSyncFailure[];
}

export interface SprintAIPlanRequest {
  capacity: number;
  context?: string;
  config_id?: string;
  feature_ids?: string[];
}

export interface SprintAIPlanResult {
  selected_stories: StoryResponse[];
  total_points: number;
  reasoning: string;
}

// Prompt
// BRD Analysis
export type BRDSyncStatus = "new" | "exists" | "update";

export interface BRDStoryResult {
  title: string;
  description?: string;
  order: number;
  story_points: number;
  priority: number;
  sync_status: BRDSyncStatus;
  existing_id?: string | null;
}

export interface BRDFeatureResult {
  name: string;
  description?: string;
  order: number;
  priority: number;
  stories: BRDStoryResult[];
  sync_status: BRDSyncStatus;
  existing_id?: string | null;
}

export interface BRDAnalysisResult {
  project_context: string;
  features: BRDFeatureResult[];
}

export interface BRDStorySave {
  title: string;
  description?: string;
  order: number;
  story_points: number;
  priority: number;
  existing_id?: string | null;
}

export interface BRDFeatureSave {
  name: string;
  description?: string;
  order: number;
  priority: number;
  stories: BRDStorySave[];
  existing_id?: string | null;
}

export interface BRDBulkSaveRequest {
  created_by: string;
  features: BRDFeatureSave[];
  project_context?: string;
  save_context: boolean;
}

export interface BRDBulkSaveResponse {
  created_features: number;
  updated_features: number;
  created_stories: number;
  updated_stories: number;
}

export interface PromptCreate {
  content: string;
  target_ai?: string;
  tech_stacks?: string;
  extra_context?: string;
}

export interface PromptResponse {
  id: string;
  story_id: string;
  content: string;
  target_ai: string;
  tech_stacks?: string;
  extra_context?: string;
  created_at: string;
  updated_at: string;
}
