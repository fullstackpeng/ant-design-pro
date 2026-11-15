import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  type OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { createPool } from './database.js';
import { verifyPassword } from './password.js';

export const SESSION_COOKIE = 'antd_session';

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly pool = createPool();

  async login(body: unknown) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({
        success: false,
        errorMessage: '请输入用户名和密码',
      });
    }
    const { username, password, autoLogin, type } = body as Record<
      string,
      unknown
    >;
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      username.length > 64 ||
      typeof password !== 'string' ||
      !password ||
      password.length > 1024 ||
      (autoLogin !== undefined && typeof autoLogin !== 'boolean') ||
      (type !== undefined && type !== 'account')
    ) {
      throw new BadRequestException({
        success: false,
        errorMessage: '请使用有效的账号和密码登录',
      });
    }
    const result = await this.pool.query<{
      id: string;
      password_hash: string;
    }>('SELECT id, password_hash FROM app_users WHERE username = $1', [
      username.trim(),
    ]);
    const user = result.rows[0];
    // Derive a key even for unknown users to avoid skipping password verification.
    const valid = await verifyPassword(
      password,
      user?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
    );
    if (!user || !valid) {
      throw new UnauthorizedException({
        success: false,
        errorCode: 401,
        errorMessage: '用户名或密码错误',
      });
    }
    const token = randomBytes(32).toString('hex');
    const maxAge = (autoLogin === true ? 7 * 24 : 12) * 60 * 60 * 1000;
    await this.pool.query(
      'INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash(token), user.id, new Date(Date.now() + maxAge)],
    );
    return { token, maxAge, remember: autoLogin === true };
  }

  async currentUser(token: string | undefined) {
    if (token) {
      const result = await this.pool.query<{
        userid: string;
        name: string;
        access: string;
      }>(
        `SELECT u.id::text AS userid, u.name, u.access
         FROM app_sessions s JOIN app_users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash(token)],
      );
      if (result.rows[0]) return result.rows[0];
    }
    throw new UnauthorizedException({
      success: false,
      errorCode: 401,
      errorMessage: '请先登录',
    });
  }

  async logout(token: string | undefined) {
    if (token) {
      await this.pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [
        tokenHash(token),
      ]);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
