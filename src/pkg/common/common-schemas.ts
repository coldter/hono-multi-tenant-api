import { ErrorSchema } from "@/pkg/errors/http";
import { formatMobileNumber, isMobileNumberValid } from "@/pkg/utils/phone-number";
import { z } from "@hono/zod-openapi";
import { parse, parseJSON } from "date-fns";
import type { RefinementCtx } from "zod";

export const failWithErrorSchema = ErrorSchema;

const nonZeroNumberRefineFn = (max: number) => (value: string | undefined) => {
  if (!value) {
    return true;
  }
  return Number(value) > 0 && Number(value) <= max;
};

const intNumberRefineFn = (value: string | undefined) => {
  if (!value) {
    return true;
  }
  return Number(value) >= 0;
};

const transformToNumber = (value: string | undefined, _ctx: RefinementCtx): number => {
  return Number(value);
};

export const paginationQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(["createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z
    .string()
    .default("50")
    .refine(nonZeroNumberRefineFn(1000), "limit must be greater than 0")
    .transform(transformToNumber),
  offset: z
    .string()
    .default("0")
    .refine(intNumberRefineFn, "offset must be an integer")
    .transform(transformToNumber),
});

/**
 * @description
 */
export const mobileNumberSchema = z
  .string()
  .min(10)
  .max(20)
  .refine(
    (value) => {
      return isMobileNumberValid(value);
    },
    {
      message: "Invalid phone number",
    },
  )
  .transform((value) => {
    return formatMobileNumber(value);
  })
  .openapi({
    default: "+911234567890",
    description: "Mobile number of the user",
  });

/**
 * @description YYYY-MM-DD date string
 */
export const dateSchema = z
  .string()
  .transform<Date>((value) => z.date().parse(parse(value, "yyyy-MM-dd", new Date())));

/**
 * @description ISO date string
 */
export const dateOfBirthSchema = z
  .string()
  .transform<Date>((value) => z.date().parse(parseJSON(value)));
