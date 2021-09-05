import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'e2e@email.com',
  password: '1234',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
            createAccount(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
              role: Client
            }) {
              ok
              error
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            createAccount: { ok, error },
          } = res.body.data;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
        createAccount(input: {
          email: "${testUser.email}"
          password: "${testUser.password}"
          role: Client
        }) {
          ok
          error
        }
      }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            createAccount: { ok, error },
          } = res.body.data;
          expect(ok).toBe(false);
          expect(error).toEqual(expect.any(String));
        });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
            login(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
            }) {
              ok
              error
              token
            }
          }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            login: { ok, error, token },
          } = res.body.data;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(token).toEqual(expect.any(String));
          jwtToken = token;
        });
    });

    it('should not be able to login with wrong credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `mutation {
          login(input: {
            email: "${testUser.email}"
            password: "${testUser.password + 1}"
          }) {
            ok
            error
            token
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            login: { ok, error, token },
          } = res.body.data;
          expect(ok).toBe(false);
          expect(error).toBe('Wrong Password');
          expect(token).toBe(null);
          jwtToken = token;
        });
    });
  });

  it.todo('userProfile');
  it.todo('me');
  it.todo('verifyEmail');
  it.todo('editProfile');
});
