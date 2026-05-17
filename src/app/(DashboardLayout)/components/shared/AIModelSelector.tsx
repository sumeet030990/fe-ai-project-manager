"use client";
import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getAIConfigs } from "@/services/ai-configs";
import { AIProvider, ProjectAIConfigResponse } from "@/types";

const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: "Claude",
  openai: "OpenAI",
  groq: "Groq",
  deepseek: "DeepSeek",
  other: "Other",
};

interface Props {
  projectId: string;
  value: string;
  onChange: (configId: string) => void;
  label?: string;
}

export default function AIModelSelector({ projectId, value, onChange, label = "AI Model" }: Props) {
  const { data } = useQuery({
    queryKey: ["ai-configs", projectId],
    queryFn: () => getAIConfigs(projectId, 1, 50),
  });

  const configs = data?.items ?? [];

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value as string)}
      >
        <MenuItem value="">
          <Box>
            <Typography variant="body2">Project default</Typography>
            <Typography variant="caption" color="textSecondary">
              Uses the config marked as default, or falls back to server Groq key
            </Typography>
          </Box>
        </MenuItem>
        {configs.map((config: ProjectAIConfigResponse) => (
          <MenuItem key={config.id} value={config.id}>
            <Box>
              <Typography variant="body2">
                {PROVIDER_LABELS[config.provider as AIProvider] ?? config.provider} — {config.model_name}
                {config.is_default && (
                  <Typography component="span" variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                    (default)
                  </Typography>
                )}
              </Typography>
              <Typography variant="caption" color="textSecondary" fontFamily="monospace">
                {config.api_key_masked}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
