import type { Database } from "@/database/db";
import { accounts, sessions } from "@/database/schema";
import { storage } from "@/pkg/storage/storage";
import { typeIdGenerator } from "@/pkg/utils/typeid";
import { eq, inArray, lte } from "drizzle-orm";
import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";

const sessionStorage = storage.session;

export class CustomLuciaAuthAdapter implements Adapter {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.sessionToken, sessionId));
    await sessionStorage.removeItem(sessionId);
  }

  public async deleteUserSessions(userId: UserId): Promise<void> {
    const accountObject = await this.db.query.accounts.findFirst({
      where: eq(accounts.id, userId),
      with: {
        sessions: {
          columns: {
            sessionToken: true,
          },
        },
      },
    });

    if (!accountObject) {
      return;
    }

    const sessionIds = accountObject.sessions.map((session) => session.sessionToken);

    if (sessionIds.length > 0) {
      await this.db.delete(sessions).where(inArray(sessions.sessionToken, sessionIds));
    }

    await Promise.allSettled(sessionIds.map((id) => sessionStorage.removeItem(id)));
  }

  public async getSessionAndUser(
    sessionId: string,
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    return Promise.all([this.getSession(sessionId), this.getUserFromSessionId(sessionId)]);
  }

  public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const accountSession = await this.db.query.sessions.findMany({
      where: eq(sessions.accountId, userId),
      columns: {
        sessionToken: true,
        expiresAt: true,
        device: true,
        os: true,
      },
      with: {
        account: {
          columns: {
            id: true,
            publicId: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });

    return accountSession.map((s) => ({
      id: s.sessionToken,
      userId: s.account.id,
      expiresAt: new Date(s.expiresAt),
      attributes: {
        account: {
          id: s.account.id,
          publicId: s.account.publicId,
          role: s.account.role,
          tenantId: s.account.tenantId,
        },
        device: s.device,
        os: s.os,
      },
    }));
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    const accountId = session.attributes.account.id;
    const accountPublicId = session.attributes.account.publicId;
    const sessionPublicId = typeIdGenerator("accountSession");

    await this.db.insert(sessions).values({
      accountId,
      publicId: sessionPublicId,
      sessionToken: session.id,
      accountPublicId: accountPublicId,
      device: session.attributes.device,
      os: session.attributes.os,
      expiresAt: session.expiresAt.getTime(),
    });

    await sessionStorage.setItem(session.id, session);
  }

  public async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(sessions)
      .set({ expiresAt: expiresAt.getTime() })
      .where(eq(sessions.sessionToken, sessionId));
  }

  public async deleteExpiredSessions(): Promise<void> {
    await this.db.delete(sessions).where(lte(sessions.expiresAt, Date.now()));
  }

  private async getSession(sessionId: string): Promise<DatabaseSession | null> {
    const cachedSession = await sessionStorage.getItem(sessionId);
    if (cachedSession) {
      return cachedSession;
    }

    const accountSession = await this.db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionId),
      columns: {
        sessionToken: true,
        expiresAt: true,
        device: true,
        os: true,
      },
      with: {
        account: {
          columns: {
            id: true,
            publicId: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });

    if (!accountSession) {
      return null;
    }

    const dbSession = {
      id: accountSession.sessionToken,
      userId: accountSession.account.id,
      expiresAt: new Date(accountSession.expiresAt),
      attributes: {
        account: {
          id: accountSession.account.id,
          publicId: accountSession.account.publicId,
          role: accountSession.account.role,
          tenantId: accountSession.account.tenantId,
        },
        device: accountSession.device,
        os: accountSession.os,
      },
    };

    await sessionStorage.setItem(sessionId, dbSession);

    return dbSession;
  }

  private async getUserFromSessionId(sessionId: string): Promise<DatabaseUser | null> {
    const accountSession = await this.db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionId),
      columns: {
        id: true,
      },
      with: {
        account: {
          columns: {
            id: true,
            publicId: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });

    if (!accountSession?.account) {
      return null;
    }

    return {
      id: accountSession.account.id,
      attributes: {
        id: accountSession.account.id,
        publicId: accountSession.account.publicId,
        role: accountSession.account.role,
        tenantId: accountSession.account.tenantId,
      },
    };
  }
}
