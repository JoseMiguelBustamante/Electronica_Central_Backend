import { errorCodes } from '../config/errorCodes.js';
import {
  addLog,
  createClient,
  createUser,
  listClients,
  listLogs,
  listUsers,
  revokeUserSessions,
  setUserPassword,
  userById,
} from '../repositories/securityRepository.js';
import { setPasswordChangeRequired } from '../repositories/authRepository.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../utils/AppError.js';

export const createClientService = async (data, actor) => {
  try {
    const client = await createClient(data);
    await addLog('CLIENTE_CREADO', client.id_cliente, 'OK', actor.id);
    return client;
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT);
    throw error;
  }
};

export const listClientsService = listClients;

export const listUsersService = listUsers;

export const createUserService = async (data, actor) => {
  try {
    const user = await createUser(
      data.nombreUsuario,
      data.correo,
      await hashPassword(data.contrasena),
      data.roles,
    );
    await addLog('USUARIO_CREADO', user.id_usuario, 'OK', actor.id);
    return user;
  } catch (error) {
    if (error.code === '23505') throw new AppError(errorCodes.CONFLICT);
    throw error;
  }
};

export const resetUserService = async (id, data, actor) => {
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
  await addLog('ACCESO_RESTABLECIDO', id, 'OK', actor.id);
  return { id, restablecido: true };
};

export const listLogsService = listLogs;
