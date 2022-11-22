import { z } from "zod"

export const commonLineInterfaceConfigSchema = z.object({
  title: z.string(),
})

export const lineDashboardConfigSchema = commonLineInterfaceConfigSchema.extend(
  {}
)
