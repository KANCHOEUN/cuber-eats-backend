import { Module } from '@nestjs/common';
import { RestaruantResolver } from './restaurants.resolver';

@Module({ providers: [RestaruantResolver] })
export class RestaurantsModule {}
