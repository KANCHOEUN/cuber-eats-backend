/* eslint-disable @typescript-eslint/ban-types */
import { Query, Resolver } from '@nestjs/graphql';
import { Restaurant } from './entities/restaurant.entity';

@Resolver((of) => Restaurant)
export class RestaruantResolver {
  @Query((returns) => Restaurant)
  myRestaurant() {
    return true;
  }
}
