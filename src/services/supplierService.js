import { errorCodes } from '../config/errorCodes.js';
import {
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
} from '../repositories/supplierRepository.js';
import { AppError } from '../utils/AppError.js';

const translateDatabaseError = (error) => {
  if (error.code === '23505') throw new AppError(errorCodes.CONFLICT, 409, { reason: 'DUPLICATE_DOCUMENTO' });
  throw error;
};

const mapSupplier = (row) => ({
  idProveedor: row.id_proveedor,
  razonSocial: row.razon_social,
  documento: row.documento,
  telefono: row.telefono,
  correo: row.correo,
  direccion: row.direccion,
  activo: row.activo,
});

export const listSuppliersService = async ({ buscar, activo, pagina, limite }) => {
  const rows = await listSuppliers(buscar, activo, limite, (pagina - 1) * limite);
  const total = Number(rows[0]?.total ?? 0);
  return {
    items: rows.map(mapSupplier),
    total,
    pagina,
    limite,
  };
};

export const getSupplierService = async (id) => {
  const row = await getSupplierById(id);
  if (!row) throw new AppError(errorCodes.NOT_FOUND);
  return mapSupplier(row);
};

export const createSupplierService = async (body) => {
  try {
    const row = await createSupplier(body);
    return mapSupplier(row);
  } catch (error) {
    return translateDatabaseError(error);
  }
};

export const updateSupplierService = async (id, body) => {
  try {
    const row = await updateSupplier(id, {
      razonSocial: body.razonSocial,
      hasDocumento: Object.prototype.hasOwnProperty.call(body, 'documento'),
      documento: body.documento,
      hasTelefono: Object.prototype.hasOwnProperty.call(body, 'telefono'),
      telefono: body.telefono,
      hasCorreo: Object.prototype.hasOwnProperty.call(body, 'correo'),
      correo: body.correo,
      hasDireccion: Object.prototype.hasOwnProperty.call(body, 'direccion'),
      direccion: body.direccion,
      activo: body.activo,
    });
    if (!row) throw new AppError(errorCodes.NOT_FOUND);
    return mapSupplier(row);
  } catch (error) {
    if (error instanceof AppError) throw error;
    return translateDatabaseError(error);
  }
};
