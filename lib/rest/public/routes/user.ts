import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '../../../errors';
import { fetchUserByUsername } from '../../../orm';
import { ErrorRes, ResUser } from '../../../types';
import { userToResCreator } from '../../private/routes/topics';
import type { Option, App } from '../../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App, { tags = [] }: Option) {
  app.addSchema(ResUser);
  app.addSchema(ErrorRes);

  app.get(
    '/users/:username',
    {
      schema: {
        params: t.Object({
          username: t.String({ minLength: 1, maxLength: 32 }),
        }),
        operationId: 'getUser',
        tags,
        response: {
          200: t.Ref(ResUser),
          404: t.Ref(ErrorRes, { description: 'user not found' }),
        },
      },
    },
    async (req) => {
      const user = await fetchUserByUsername(req.params.username);
      if (!user) {
        throw new NotFoundError('user');
      }

      return userToResCreator(user);
    },
  );
}