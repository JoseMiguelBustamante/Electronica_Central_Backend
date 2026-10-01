import { z } from 'zod';

const nameDto = z.string().trim().min(1).max(120);
const optionalDescriptionDto = z.string().trim().max(2_000).optional();
const uuidDto = z.string().uuid();

export const productIdParamsDto = z.object({
  id: uuidDto,
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

export const createUnitDto = z.object({
  nombre: nameDto,
  simbolo: nameDto,
  permiteFraccion: z.boolean().default(false),
});

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
export const createProductDto = z.object({
  codigo: nameDto,
  nombre: nameDto,
  descripcion: optionalDescriptionDto,
  precioVenta: z.coerce.number().finite().nonnegative(),
  idCategoria: uuidDto,
  idUnidadMedida: uuidDto,
  idUbicacion: uuidDto,
  idMarca: uuidDto.optional(),
  idModelo: uuidDto.optional(),
  stockMinimo: z.coerce.number().finite().nonnegative().default(0),
});
export const deactivateProductDto = z.object({ activo: z.literal(false) });
export const createCompatibilityDto = z.object({ idModelo: uuidDto, observaciones: optionalDescriptionDto });
export const publicProductsQueryDto = z.object({
  buscar: z.string().trim().min(1).max(120).optional(),
  idCategoria: uuidDto.optional(),
  idMarca: uuidDto.optional(),
  idModelo: uuidDto.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});
