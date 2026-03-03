/**
 * Validation utilities for API inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class Validator {
  private errors: ValidationError[] = [];

  // Email validation
  static isEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // UUID validation
  static isUUID(uuid: string): boolean {
    const re =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return re.test(uuid);
  }

  // Number validation
  static isNumber(val: any): boolean {
    return typeof val === "number" && !isNaN(val);
  }

  // Integer validation
  static isInteger(val: any): boolean {
    return Number.isInteger(val);
  }

  // String validation
  static isString(val: any): boolean {
    return typeof val === "string";
  }

  // Required field
  field(name: string, value: any): this {
    if (!value) {
      this.errors.push({ field: name, message: `${name} مطلوب` });
    }
    return this;
  }

  // Validate email
  email(name: string, value: string): this {
    if (value && !Validator.isEmail(value)) {
      this.errors.push({
        field: name,
        message: `${name} بريد إلكتروني غير صالح`,
      });
    }
    return this;
  }

  // String min length
  minLength(name: string, value: string, min: number): this {
    if (value && value.length < min) {
      this.errors.push({
        field: name,
        message: `${name} يجب أن يكون ${min} أحرف على الأقل`,
      });
    }
    return this;
  }

  // String max length
  maxLength(name: string, value: string, max: number): this {
    if (value && value.length > max) {
      this.errors.push({
        field: name,
        message: `${name} يجب أن يكون ${max} أحرف على الأكثر`,
      });
    }
    return this;
  }

  // Number range
  range(name: string, value: number, min: number, max: number): this {
    if (typeof value === "number") {
      if (value < min || value > max) {
        this.errors.push({
          field: name,
          message: `${name} يجب أن يكون بين ${min} و ${max}`,
        });
      }
    }
    return this;
  }

  // Is valid UUID
  uuid(name: string, value: string): this {
    if (value && !Validator.isUUID(value)) {
      this.errors.push({ field: name, message: `${name} معرّف غير صالح` });
    }
    return this;
  }

  // In enum
  enum(name: string, value: string, allowed: string[]): this {
    if (value && !allowed.includes(value)) {
      this.errors.push({
        field: name,
        message: `${name} يجب أن يكون من: ${allowed.join(", ")}`,
      });
    }
    return this;
  }

  // Check if valid
  isValid(): boolean {
    return this.errors.length === 0;
  }

  // Get errors
  getErrors(): ValidationError[] {
    return this.errors;
  }

  // Throw if invalid
  throwIfInvalid(): void {
    if (!this.isValid()) {
      const err = new Error("Validation failed");
      (err as any).status = 400;
      (err as any).errors = this.errors;
      throw err;
    }
  }
}

// Helper to create new validator
export function createValidator() {
  return new Validator();
}
