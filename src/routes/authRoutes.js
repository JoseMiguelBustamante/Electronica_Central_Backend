import { Router } from 'express';
import {
  changePasswordAuthController,
  getMeAuthController,
  loginAuthController,
  logoutAuthController,
  registerAuthController,
} from '../controllers/authController.js';
import {
  changePasswordAuthDto,
  loginAuthDto,
  registerAuthDto,
} from '../dto/auth.dto.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';

const authRouter = Router();

authRouter.post('/registro', validateBody(registerAuthDto), registerAuthController);
authRouter.post('/login', validateBody(loginAuthDto), loginAuthController);
authRouter.get('/me', authenticate, getMeAuthController);
authRouter.post('/logout', authenticate, logoutAuthController);
authRouter.post(
  '/cambiar-contrasena',
  authenticate,
  validateBody(changePasswordAuthDto),
  changePasswordAuthController,
);

export default authRouter;
