import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaruantResolver } from './restaurants.resolver';
import { RestaurantService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant])],
  providers: [RestaruantResolver, RestaurantService],
})
export class RestaurantsModule {}
