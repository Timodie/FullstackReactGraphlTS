import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { __prod__ } from './constants';
import { MyContext } from './types';
import cors from 'cors';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  try {
    await orm.getMigrator().up();
  } catch (error) {
    // console.log(error);
  }

  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true
    })
  );
  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();
  // session middleware should init before apollo because we'll use it in apollo
  /**
   * How sessions work
   * 1. login : userId gets stored in redis e.g. sess:qwreqwewqewwqe -> { userId: 1}
   * 2. express-session sets cookie on browser
   * 3. user makes a request with the cookie included in the req header
   * 4. cookie is decrypted using secret
   * 5. request is made to redis to retrieve decryped key and then stored in session
   */
  app.use(
    session({
      name: 'learnGraphQLCookie',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true // make cookies last forever , reduce requests to redis
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
        secure: __prod__,
        sameSite: 'lax' // protects csrf TODO: read more about CSRF
      },
      saveUninitialized: false,
      secret: 'changethistosmethingelsepassviaenvVariables',
      resave: false
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res })
  });
  apolloServer.applyMiddleware({
    app,
    cors: false // Access-Control-Allow-Origin must not be wildcard * ,
  });
  app.listen(4000, () => {
    console.log('GraphQL server started on localhost:4000');
  });
};

main().catch((err) => {
  console.log('ERROR');
  console.log(err);
});
