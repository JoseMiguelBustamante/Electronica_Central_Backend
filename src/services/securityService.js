import { errorCodes } from '../config/errorCodes.js';
import {
  createClient,
  createUser,
  listClients,
  listLogs,
  listUsers,
  revokeUserSessions,
  setUserPassword,
  updateUser,
  userById,
} from '../repositories/securityRepository.js';
import { setPasswordChangeRequired } from '../repositories/authRepository.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../utils/AppError.js';
import { audit } from './auditService.js';

export const createClientService = async (data, actor, req) => {
  try {
    const client = await createClient(data);
    await audit(req, 'CLIENTE_CREADO', 'cliente', client.id_cliente, { idUsuario: actor.id });
    return client;
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT);
    throw error;
  }
};

export const listClientsService = listClients;

export const listUsersService = listUsers;

export const createUserService = async (data, actor, req) => {
  // Staff only (ADMINISTRADOR / VENDEDOR). Clients self-register via /api/auth/registro.
  if (data.roles.some((role) => role === 'CLIENTE')) {
    throw new AppError(errorCodes.VALIDATION_ERROR, 400, {
      message: 'Los clientes se registran solos. Acá solo se dan de alta empleados.',
    });
  }
  try {
    const user = await createUser(
      data.nombreUsuario,
      data.correo,
      await hashPassword(data.contrasena),
      data.roles,
    );
    await audit(req, 'USUARIO_CREADO', 'usuario', user.id_usuario, { idUsuario: actor.id });
    return user;
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(errorCodes.CONFLICT, 409, { message: 'El correo o nombre de usuario ya está registrado.' });
    }
    throw error;
  }
};

/** Same guard as password reset: nobody touches DESARROLLADOR, only DESARROLLADOR touches another admin. */
const assertCanManage = (target, actor) => {
  const actorDev = actor.roles.includes('DESARROLLADOR');
  const targetAdmin = target.roles.includes('ADMINISTRADOR');
  if (target.roles.includes('DESARROLLADOR') || (!actorDev && targetAdmin && target.id_usuario !== actor.id)) {
    throw new AppError(errorCodes.ACCESS_DENIED);
  }
};

export const updateUserService = async (id, data, actor, req) => {
  const target = await userById(id);
  if (!target) throw new AppError(errorCodes.NOT_FOUND);
  assertCanManage(target, actor);

  if (id === actor.id && (data.activo === false || data.roles)) {
    throw new AppError(errorCodes.BUSINESS_RULE, 422, {
      message: 'No puedes desactivarte ni cambiar tu propio rol.',
    });
  }

  let user;
  try {
    user = await updateUser(id, data);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(errorCodes.CONFLICT, 409, { message: 'El correo o nombre de usuario ya está registrado.' });
    }
    throw error;
  }
  if (data.activo === false) await revokeUserSessions(id);

  const accion = data.activo === false ? 'USUARIO_DESACTIVADO' : data.activo === true ? 'USUARIO_ACTIVADO' : 'USUARIO_EDITADO';
  await audit(req, accion, 'usuario', id, { idUsuario: actor.id });
  return { ...user, roles: data.roles ?? target.roles };
};

export const resetUserService = async (id, data, actor, req) => {
  const target = await userById(id);
  if (!target) throw new AppError(errorCodes.NOT_FOUND);

  const actorDev = actor.roles.includes('DESARROLLADOR');
  const targetAdmin = target.roles.includes('ADMINISTRADOR');
  if (target.roles.includes('DESARROLLADOR') || (!actorDev && targetAdmin)) {
    throw new AppError(errorCodes.ACCESS_DENIED);
  }

  await setUserPassword(id, await hashPassword(data.contrasenaTemporal));
  await setPasswordChangeRequired(id, true);
  await revokeUserSessions(id);
  await audit(req, 'ACCESO_RESTABLECIDO', 'usuario', id, { idUsuario: actor.id });
  return { id, restablecido: true };
};

export const listLogsService = (filters) => listLogs(filters);
