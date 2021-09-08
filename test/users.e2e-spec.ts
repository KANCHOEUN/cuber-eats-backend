import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Verification } from 'src/users/entities/verification.entity';

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
  let usersRepository: Repository<User>;
  let verificationsRepository: Repository<Verification>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    verificationsRepository = moduleFixture.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return publicTest(`mutation {
            createAccount(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
              role: Client
            }) {
              ok
              error
            }
          }`)
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
      return publicTest(`mutation {
        createAccount(input: {
          email: "${testUser.email}"
          password: "${testUser.password}"
          role: Client
        }) {
          ok
          error
        }
      }`)
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
      return publicTest(`mutation {
            login(input: {
              email: "${testUser.email}"
              password: "${testUser.password}"
            }) {
              ok
              error
              token
            }
          }`)
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
      return publicTest(`mutation {
          login(input: {
            email: "${testUser.email}"
            password: "${testUser.password + 1}"
          }) {
            ok
            error
            token
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            login: { ok, error, token },
          } = res.body.data;
          expect(ok).toBe(false);
          expect(error).toBe('Wrong Password');
          expect(token).toBe(null);
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;

    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it('should find a user', () => {
      return privateTest(`{
          userProfile(userId:${userId}) {
            ok
            error
            user {
              id
            }
          }
        }`)
        .expect(200)
        .expect((res) => {
          const {
            ok,
            error,
            user: { id },
          } = res.body.data.userProfile;

          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });

    it('should not find a user', async () => {
      return privateTest(`{
          userProfile(userId: ${userId + 999}) {
            ok
            error
            user {
              id
            }
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error, user } = res.body.data.userProfile;
          expect(ok).toBe(false);
          expect(error).toBe('User Not Found');
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    it('should find my profile if login', () => {
      return privateTest(`{
          me {
            email
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { email } = res.body.data.me;
          expect(email).toBe(testUser.email);
        });
    });

    it('should not allow if not login', () => {
      return publicTest(`{
        me {
          email
        }
      }`)
        .expect(200)
        .expect((res) => {
          const { errors } = res.body;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;

    beforeAll(async () => {
      const [verification] = await verificationsRepository.find();
      verificationCode = verification.code;
    });

    it('should verify email', () => {
      return publicTest(`mutation {
        verifyEmail(input: {
          code: "${verificationCode}"
        }) {
          ok
          error
        }
      }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail on verification code not found', () => {
      return publicTest(`mutation {
      verifyEmail(input: {
        code: "xxxxx"
      }) {
        ok
        error
      }
    }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBe(false);
          expect(error).toBe('Verification Not Found.');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'new@email.com';

    it('should change email', () => {
      return privateTest(`mutation {
          editProfile(input: {
            email: "${NEW_EMAIL}"
          }) {
            ok
            error
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.editProfile;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should have new email', () => {
      return privateTest(`{
        me {
          email
        }
      }`)
        .expect(200)
        .expect((res) => {
          const { email } = res.body.data.me;
          expect(email).toBe(NEW_EMAIL);
        });
    });
  });
});
