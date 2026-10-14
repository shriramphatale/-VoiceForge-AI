import { z } from "zod";

/** Schema for the multipart body fields accompanying the audio upload. */
export const createVoiceBodySchema = z.object({
  name: z
    .string()
    .min(1, "Voice name is required")
    .max(100, "Voice name must be 100 characters or fewer")
    .trim(),
  consentConfirmed: z.preprocess(
    (v) => v === "true" || v === true || v === "1",
    z
      .boolean()
      .refine((v) => v === true, {
        message:
          "You must confirm that you have authorisation to clone this voice.",
      }),
  ),
});

export type CreateVoiceBody = z.infer<typeof createVoiceBodySchema>;
