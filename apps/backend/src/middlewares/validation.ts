import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

export const validateRequest = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      // Replace req.body with validated data so that any defaults or transforms are applied
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Request validation failed.",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};
