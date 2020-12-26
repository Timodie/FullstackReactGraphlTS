import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {
  Resolver,
  Ctx,
  Mutation,
  InputType,
  Field,
  Arg,
  Query,
  ObjectType
} from 'type-graphql';
import argon2 from 'argon2';

@InputType() // arguments object
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType() // returned
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: 'username',
            message: 'username length must be greater than 2'
          }
        ]
      };
    }
    if (options.username.length <= 3) {
      return {
        errors: [
          {
            field: 'password',
            message: 'password length must be greater than 3'
          }
        ]
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword
    });
    try {
      await em.persistAndFlush(user);
    } catch (err) {
      console.log(err);

      if (err.code === '23505' || err.detail.includes('already exists')) {
        return {
          errors: [
            {
              field: 'username',
              message: 'username already exists'
            }
          ]
        };
      }
    }
    return { user };
  }

  @Query(() => [User])
  async users(@Ctx() ctx: MyContext): Promise<User[]> {
    return ctx.em.find(User, {});
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, {
      username: options.username.toLocaleLowerCase()
    });
    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: `${options.username} does not exist`
          }
        ]
      };
    }
    const validPassword = await argon2.verify(user.password, options.password);
    if (!validPassword) {
      return {
        errors: [
          {
            field: 'password',
            message: 'wrong password'
          }
        ]
      };
    }
    return {
      user
    };
  }
}
