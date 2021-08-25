/* eslint-disable @typescript-eslint/ban-types */
import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class RestaruantResolver {
  @Query((returns) => Boolean)
  isPizzaGood(): Boolean {
    return true;
  }
}
