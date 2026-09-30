const { z } = require('zod');

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const name = z.string().trim().min(1).max(100);

const registerSchema = z.object({ name, email, password });

const loginSchema = z.object({ email, password: z.string().min(1) });

const updateUserSchema = z
  .object({ name, email, password, role: z.enum(['user', 'admin']) })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { registerSchema, loginSchema, updateUserSchema, idParamSchema, paginationSchema };
