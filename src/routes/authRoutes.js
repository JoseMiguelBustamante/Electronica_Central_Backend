import { Router } from 'express';
import {
  changePasswordAuthController,
  getMeAuthController,
  loginAuthController,
  logoutAuthController,
  recoverPasswordAuthController,
  registerAuthController,
  resetPasswordAuthController,
} from '../controllers/authController.js';
import {
  changePasswordAuthDto,
  loginAuthDto,
  recoverPasswordDto,
  registerAuthDto,
  resetPasswordWithTokenDto,
} from '../dto/auth.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';

const authRouter = Router();

authRouter.post('/registro', validateBody(registerAuthDto), registerAuthController);
authRouter.post('/login', validateBody(loginAuthDto), loginAuthController);
authRouter.post('/recuperar', validateBody(recoverPasswordDto), recoverPasswordAuthController);
authRouter.post('/restablecer', validateBody(resetPasswordWithTokenDto), resetPasswordAuthController);
authRouter.get('/me', authenticate, getMeAuthController);
authRouter.post('/logout', authenticate, logoutAuthController);
authRouter.post(
  '/cambiar-contrasena',
  authenticate,
  validateBody(changePasswordAuthDto),
  changePasswordAuthController,
);

export default authRouter;
