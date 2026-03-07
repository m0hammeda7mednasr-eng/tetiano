import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface ValidationRule {
  field: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "email"
    | "url"
    | "uuid"
    | "array"
    | "object";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

function validateField(value: any, rule: ValidationRule): string | null {
  // Check required
  if (
    rule.required &&
    (value === undefined || value === null || value === "")
  ) {
    return `${rule.field} is required`;
  }

  // Skip validation if not required and value is empty
  if (
    !rule.required &&
    (value === undefined || value === null || value === "")
  ) {
    return null;
  }

  // Type validation
  switch (rule.type) {
    case "string":
      if (typeof value !== "string") {
        return `${rule.field} must be a string`;
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return `${rule.field} must be at least ${rule.min} characters`;
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return `${rule.field} must be at most ${rule.max} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${rule.field} has invalid format`;
      }
      break;

    case "number":
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return `${rule.field} must be a valid number`;
      }
      if (rule.min !== undefined && num < rule.min) {
        return `${rule.field} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && num > rule.max) {
        return `${rule.field} must be at most ${rule.max}`;
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        return `${rule.field} must be a boolean`;
      }
      break;

    case "email":
      if (typeof value !== "string") {
        return `${rule.field} must be a string`;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return `${rule.field} must be a valid email`;
      }
      break;

    case "url":
      if (typeof value !== "string") {
        return `${rule.field} must be a string`;
      }
      try {
        new URL(value);
      } catch {
        return `${rule.field} must be a valid URL`;
      }
      break;

    case "uuid":
      if (typeof value !== "string") {
        return `${rule.field} must be a string`;
      }
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(value)) {
        return `${rule.field} must be a valid UUID`;
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        return `${rule.field} must be an array`;
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return `${rule.field} must have at least ${rule.min} items`;
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return `${rule.field} must have at most ${rule.max} items`;
      }
      break;

    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return `${rule.field} must be an object`;
      }
      break;
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    return `${rule.field} must be one of: ${rule.enum.join(", ")}`;
  }

  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      return typeof result === "string" ? result : `${rule.field} is invalid`;
    }
  }

  return null;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const rule of schema.body) {
        const value = req.body?.[rule.field];
        const error = validateField(value, rule);
        if (error) errors.push(error);
      }
    }

    // Validate query
    if (schema.query) {
      for (const rule of schema.query) {
        const value = req.query?.[rule.field];
        const error = validateField(value, rule);
        if (error) errors.push(error);
      }
    }

    // Validate params
    if (schema.params) {
      for (const rule of schema.params) {
        const value = req.params?.[rule.field];
        const error = validateField(value, rule);
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      logger.warn("Validation failed", { errors, path: req.path });
      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    next();
  };
}

// Common validation rules
export const commonRules = {
  email: {
    field: "email",
    type: "email" as const,
    required: true,
    max: 255,
  },
  password: {
    field: "password",
    type: "string" as const,
    required: true,
    min: 8,
    max: 128,
  },
  shopDomain: {
    field: "shop",
    type: "string" as const,
    required: true,
    pattern: /^[a-z0-9-]+\.myshopify\.com$/i,
  },
  uuid: (field: string, required = true) => ({
    field,
    type: "uuid" as const,
    required,
  }),
  positiveNumber: (field: string, required = true) => ({
    field,
    type: "number" as const,
    required,
    min: 0,
  }),
};
