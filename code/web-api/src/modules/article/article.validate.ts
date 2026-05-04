import { z } from "zod";

// Create article validation
export const createArticleSchema = z.object({
  title: z
    .string("Title is required")
    .min(5, "Title must be at least 5 characters")
    .max(255, "Title must be less than 255 characters"),
  content: z
    .string("Content is required")
    .min(20, "Content must be at least 20 characters"),
});

// Update article validation
export const updateArticleSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(255, "Title must be less than 255 characters")
      .optional(),
    content: z
      .string()
      .min(20, "Content must be at least 20 characters")
      .optional(),
  })
  .refine((data) => data.title || data.content, {
    message: "At least one field (title or content) must be provided",
  });

// Article ID validation (for path parameters)
export const articleIdSchema = z.object({
  id: z
    .string("Article ID is required")
    .regex(/^\d+$/, "Article ID must be a number")
    .transform(Number)
    .refine((val) => val > 0, "Article ID must be positive"),
});

// Article slug validation (for path parameters)
export const articleSlugSchema = z.object({
  slug: z.string("Article slug is required").min(1, "Slug cannot be empty"),
});

// Query parameters validation for listing articles
export const listArticlesSchema = z.object({
  limit: z
    .string()
    .default("10")
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional(),
  offset: z
    .string()
    .default("0")
    .transform(Number)
    .refine((val) => val >= 0, "Offset must be non-negative")
    .optional(),
});

// Type exports
export type CreateArticleRequest = z.infer<typeof createArticleSchema>;
export type UpdateArticleRequest = z.infer<typeof updateArticleSchema>;
export type ArticleIdParams = z.infer<typeof articleIdSchema>;
export type ArticleSlugParams = z.infer<typeof articleSlugSchema>;
export type ListArticlesQuery = z.infer<typeof listArticlesSchema>;
