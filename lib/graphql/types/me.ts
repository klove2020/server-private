import { objectType, extendType } from 'nexus';

import type { Context } from '../context';

export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('ID');
    t.nonNull.string('username');
    t.nonNull.string('nickname');
  },
});

export const GetCurrentUser = extendType({
  type: 'Query',
  definition(t) {
    t.nullable.field('me', {
      type: User,
      async resolve(_parent, _args, { auth }: Context) {
        return auth.user;
      },
    });
  },
});
