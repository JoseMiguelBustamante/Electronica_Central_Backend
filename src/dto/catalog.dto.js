import { z } from 'zod';

const nameDto = z.string().trim().min(1).max(120);
const optionalDescriptionDto = z.string().trim().max(2_000).optional();
const uuidDto = z.string().uuid();

export const productIdParamsDto = z.object({
  id: uuidDto,
});

export const catalogIdParamsDto = z.object({
  id: uuidDto,
});

const nonEmpty = (schema) => schema.refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

export const compatibilityParamsDto = z.object({
  id: uuidDto,
  idModelo: uuidDto,
});

export const createCategoryDto = z.object({
  nombre: nameDto,
  descripcion: optionalDescriptionDto,
});

export const createBrandDto = z.object({
  nombre: nameDto,
});

export const updateCategoryDto = nonEmpty(z.object({
  nombre: nameDto.optional(),
  descripcion: optionalDescriptionDto,
}));

export const updateBrandDto = nonEmpty(z.object({
  nombre: nameDto.optional(),
}));

export const createUnitDto = z.object({
  nombre: nameDto,
  simbolo: nameDto,
  permiteFraccion: z.boolean().default(false),
});

export const updateUnitDto = nonEmpty(z.object({
  nombre: nameDto.optional(),
  simbolo: nameDto.optional(),
  permiteFraccion: z.boolean().optional(),
}));

export const createLocationDto = z.object({
  codigo: nameDto,
  pasillo: nameDto,
  estante: nameDto,
});

export const createModelDto = z.object({
  nombre: nameDto,
  descripcion: optionalDescriptionDto,
  idMarca: uuidDto,
});

export const updateModelDto = nonEmpty(z.object({
  nombre: nameDto.optional(),
  descripcion: optionalDescriptionDto,
  idMarca: uuidDto.optional(),
}));

const moneyDto = z.coerce.number().finite().nonnegative();

export const createProductDto = z.object({
  codigo: nameDto,
  nombre: nameDto,
  descripcion: optionalDescriptionDto,
  precioVenta: moneyDto,
  precioCompra: moneyDto.default(0),
  margenGanancia: moneyDto.default(0),
  idCategoria: uuidDto,
  idUnidadMedida: uuidDto,
  idUbicacion: uuidDto,
  idMarca: uuidDto.optional(),
  idModelo: uuidDto.optional(),
  stockMinimo: z.coerce.number().finite().nonnegative().default(0),
});
/** Full edit (CU-4). `{ activo: false }` alone still deactivates, `{ activo: true }` reactivates. */
export const updateProductDto = nonEmpty(z.object({
  codigo: nameDto.optional(),
  nombre: nameDto.optional(),
  descripcion: z.string().trim().max(2_000).nullable().optional(),
  precioVenta: moneyDto.optional(),
  precioCompra: moneyDto.optional(),
  margenGanancia: moneyDto.optional(),
  idCategoria: uuidDto.optional(),
  idUnidadMedida: uuidDto.optional(),
  idUbicacion: uuidDto.optional(),
  idMarca: uuidDto.nullable().optional(),
  idModelo: uuidDto.nullable().optional(),
  stockMinimo: moneyDto.optional(),
  activo: z.boolean().optional(),
}));

export const adminProductsQueryDto = z.object({
  buscar: z.string().trim().min(1).max(120).optional(),
  idCategoria: uuidDto.optional(),
  estado: z.enum(['activos', 'inactivos', 'todos']).default('todos'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});
export const createCompatibilityDto = z.object({ idModelo: uuidDto, observaciones: optionalDescriptionDto });
export const publicProductsQueryDto = z.object({
  buscar: z.string().trim().min(1).max(120).optional(),
  idCategoria: uuidDto.optional(),
  idMarca: uuidDto.optional(),
  idModelo: uuidDto.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});
