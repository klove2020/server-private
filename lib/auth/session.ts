import dayjs from 'dayjs';
import * as typeorm from 'typeorm';

import { redisPrefix } from '@app/lib/config';
import { SessionRepo } from '@app/lib/orm';
import redis from '@app/lib/redis';
import { randomBase62String } from '@app/lib/utils';

import * as auth from './index';
import type { IAuth } from './index';

export async function create(user: { id: number; regTime: number }): Promise<string> {
  const now = dayjs().unix();
  const token = await randomBase62String(32);
  const value = {
    reg_time: dayjs().toISOString(),
    user_id: user.id,
    created_at: now,
    expired_at: now + 60 * 60 * 24 * 7,
  };

  await SessionRepo.insert({
    value: Buffer.from(JSON.stringify(value)),
    userID: user.id,
    createdAt: value.created_at,
    expiredAt: value.expired_at,
    key: token,
  });

  return token;
}

interface ICachedSession {
  userID: number;
}

/**
 * TODO: add cache
 *
 * @param sessionID - Store in user cookies
 */
export async function get(sessionID: string): Promise<IAuth | null> {
  const key = `${redisPrefix}-auth-session-${sessionID}`;
  const cached = await redis.get(key);
  if (cached) {
    const session = JSON.parse(cached) as ICachedSession;

    return await auth.byUserID(session.userID);
  }

  const session = await SessionRepo.findOne({
    where: { key: sessionID, expiredAt: typeorm.MoreThanOrEqual(dayjs().unix()) },
  });
  if (!session) {
    return null;
  }

  await redis.set(
    key,
    JSON.stringify({ userID: session.userID } satisfies ICachedSession),
    'EX',
    60,
  );

  return await auth.byUserID(session.userID);
}

export async function revoke(sessionID: string) {
  const key = `${redisPrefix}-auth-session-${sessionID}`;
  await redis.del(key);

  await SessionRepo.update({ key: sessionID }, { expiredAt: dayjs().unix() - 60 * 60 });
}
