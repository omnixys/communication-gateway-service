/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { connect, type Socket } from 'node:net';
import { connect as tlsConnect, TLSSocket } from 'node:tls';

import { getLogger } from '@omnixys/logger-ts';

import type { StalwartAuthMode } from '../../../communication-gateway/models/enums/provider-config.enum.js';

const logger = getLogger('SmtpClient', 'class');

const CRLF = '\r\n';
const MAX_LINE_BYTES = 8192;
const IMPLICIT_TLS_PORT = 465;

/** Credentials and endpoint for a single SMTP session. */
export interface SmtpCredentials {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly authMode: StalwartAuthMode;
}

/** Transport security options for a single SMTP session. */
export interface SmtpSecurity {
  readonly tlsEnabled: boolean;
  readonly tlsVerify: boolean;
  readonly timeoutMs: number;
}

/** A message ready to be relayed. */
export interface SmtpEnvelope {
  readonly from: string;
  readonly to: string;
  readonly raw: string;
}

/** Failure of an SMTP conversation. */
export class SmtpError extends Error {
  constructor(
    message: string,
    public readonly command: string,
  ) {
    super(message);
    this.name = 'SmtpError';
  }
}

/** Parsed SMTP server reply. */
export interface SmtpReply {
  readonly code: number;
  readonly text: string;
  readonly isFailure: boolean;
}

/**
 * Minimal SMTP client for the Stalwart mail server.
 *
 * The gateway needs exactly one operation - relay a single message - so the
 * implementation stays small and explicit: greeting, `EHLO`, `STARTTLS` when
 * offered, authentication, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`.
 *
 * Message framing follows RFC 5321: a leading dot is escaped and the body is
 * terminated by `<CRLF>.<CRLF>`.
 */
export class SmtpClient {
  constructor(
    private readonly credentials: SmtpCredentials,
    private readonly security: SmtpSecurity,
    private readonly tokenProvider: (() => Promise<string>) | null = null,
  ) {}

  /** Opens a session, greets the server and closes it again. */
  async probe(): Promise<boolean> {
    const session = await SmtpSession.open(this.credentials, this.security);
    try {
      await session.command('EHLO omnixys-communication-gateway');
      return true;
    } finally {
      await session.close();
    }
  }

  /** Opens a session, authenticates and relays one message. */
  async send(envelope: SmtpEnvelope): Promise<void> {
    const session = await SmtpSession.open(this.credentials, this.security);

    try {
      let capabilities = await session.command(
        'EHLO omnixys-communication-gateway',
      );
      capabilities = await this.maybeUpgrade(session, capabilities);

      if (!capabilities.text.toUpperCase().includes('AUTH')) {
        throw new SmtpError('Server does not offer AUTH', 'EHLO');
      }

      await this.authenticate(session, capabilities);
      await session.command(`MAIL FROM:<${envelope.from}>`);
      await session.command(`RCPT TO:<${envelope.to}>`);
      await session.command('DATA');
      await session.writeBody(dotStuff(envelope.raw));
      await session.command('QUIT');
      await session.close();
    } catch (error) {
      logger.warn(
        {
          host: this.credentials.host,
          command: error instanceof SmtpError ? error.command : 'UNKNOWN',
          error: error instanceof Error ? error.message : String(error),
        },
        'smtp session failed',
      );
      await session.close();
      throw error;
    }
  }

  private async maybeUpgrade(
    session: SmtpSession,
    capabilities: SmtpReply,
  ): Promise<SmtpReply> {
    const { host, port } = this.credentials;
    if (this.security.tlsEnabled === false || port === IMPLICIT_TLS_PORT) {
      return capabilities;
    }
    if (!capabilities.text.toUpperCase().includes('STARTTLS')) {
      logger.warn({ host, port }, 'server does not offer STARTTLS');
      return capabilities;
    }

    await session.command('STARTTLS');
    await session.upgrade(host, this.security.tlsVerify);
    return session.command('EHLO omnixys-communication-gateway');
  }

  private async authenticate(
    session: SmtpSession,
    capabilities: SmtpReply,
  ): Promise<void> {
    const { credentials } = this;
    if (credentials.username.length === 0) {
      throw new SmtpError('No SMTP username configured', 'AUTH');
    }

    if (credentials.authMode === 'oauthbearer') {
      await this.authenticateOauthBearer(session);
      return;
    }

    const mechanisms = capabilities.text.toUpperCase();
    if (mechanisms.includes('LOGIN')) {
      await this.authenticateLogin(session);
      return;
    }
    if (mechanisms.includes('PLAIN')) {
      const initialResponse = Buffer.from(
        `\u0000${credentials.username}\u0000${credentials.password}`,
        'utf8',
      ).toString('base64');
      await session.command(`AUTH PLAIN ${initialResponse}`);
      return;
    }
    throw new SmtpError('Server offers no supported auth mechanism', 'AUTH');
  }

  private async authenticateLogin(session: SmtpSession): Promise<void> {
    const { username, password } = this.credentials;

    const challenge = await session.command('AUTH LOGIN', {
      allowContinuation: true,
    });
    if (challenge.code !== 334) {
      throw new SmtpError('Server rejected AUTH LOGIN', 'AUTH LOGIN');
    }

    const userReply = await session.command(
      Buffer.from(username, 'utf8').toString('base64'),
      { allowContinuation: true },
    );
    if (userReply.code !== 334) {
      throw new SmtpError(userReply.text, 'AUTH LOGIN');
    }

    await session.command(Buffer.from(password, 'utf8').toString('base64'));
  }

  private async authenticateOauthBearer(session: SmtpSession): Promise<void> {
    const { username } = this.credentials;
    const token = await this.oauthToken();
    const initialResponse = Buffer.from(
      `user=${username}\u0001auth=Bearer ${token}\u0001\u0001`,
      'utf8',
    ).toString('base64');
    try {
      await session.command(`AUTH XOAUTH2 ${initialResponse}`, {
        expectAuthOutcome: true,
      });
    } catch (error) {
      throw new SmtpError(
        error instanceof Error ? error.message : String(error),
        'AUTH XOAUTH2',
      );
    }
  }

  private async oauthToken(): Promise<string> {
    if (this.tokenProvider === null) {
      throw new SmtpError(
        'No OAuth2 token provider configured',
        'AUTH XOAUTH2',
      );
    }
    return this.tokenProvider();
  }
}

/** State of one SMTP conversation over a single connection. */
class SmtpSession {
  private buffer = '';
  private waiter: {
    readonly resolve: (reply: SmtpReply) => void;
    readonly reject: (error: Error) => void;
  } | null = null;

  private constructor(
    private socket: Socket,
    private readonly timeoutMs: number,
  ) {}

  /** Connects, optionally wrapping the socket in TLS, and reads the greeting. */
  static async open(
    credentials: SmtpCredentials,
    security: SmtpSecurity,
  ): Promise<SmtpSession> {
    const socket = await SmtpSession.connect(credentials, security);
    const session = new SmtpSession(socket, security.timeoutMs);
    session.attachListeners();
    const greeting = await session.nextReply('CONNECT');
    if (greeting.isFailure) {
      await session.close();
      throw new SmtpError(greeting.text, 'CONNECT');
    }
    return session;
  }

  /** Sends a command and returns the matching reply. */
  async command(
    line: string,
    options: {
      readonly allowContinuation?: boolean;
      readonly expectAuthOutcome?: boolean;
    } = {},
  ): Promise<SmtpReply> {
    await this.write(`${line}${CRLF}`);
    const reply = await this.nextReply(line);
    const { allowContinuation = false, expectAuthOutcome = false } = options;

    if (expectAuthOutcome && reply.code === 334) {
      const final = await this.nextReply(line);
      if (final.isFailure) {
        throw new SmtpError(final.text, line);
      }
      return final;
    }
    if (allowContinuation) {
      return reply;
    }
    if (reply.isFailure) {
      throw new SmtpError(reply.text, line);
    }
    return reply;
  }

  /** Writes the message body and the terminating dot sequence. */
  async writeBody(body: string): Promise<void> {
    await this.write(`${body}${CRLF}.${CRLF}`);
    const reply = await this.nextReply('DATA');
    if (reply.isFailure) {
      throw new SmtpError(reply.text, 'DATA');
    }
  }

  /**
   * Upgrades the plain connection with STARTTLS.
   *
   * The `220 Ready to start TLS` reply was already consumed by
   * {@link SmtpSession.command}, so the handshake must not read another line
   * before wrapping the socket. RFC 3207 requires the client to send EHLO
   * again after the upgrade, which the caller does.
   */
  async upgrade(host: string, rejectUnauthorized: boolean): Promise<void> {
    this.detachListeners();
    this.buffer = '';
    this.socket = await SmtpSession.wrap(this.socket, host, rejectUnauthorized);
    this.attachListeners();
  }

  async close(): Promise<void> {
    this.detachListeners();
    this.socket.destroy();
  }

  private static async connect(
    credentials: SmtpCredentials,
    security: SmtpSecurity,
  ): Promise<Socket> {
    const implicitTls =
      security.tlsEnabled && credentials.port === IMPLICIT_TLS_PORT;
    return new Promise<Socket>((resolve, reject) => {
      const socket = implicitTls
        ? tlsConnect({
            host: credentials.host,
            port: credentials.port,
            servername: credentials.host,
            rejectUnauthorized: security.tlsVerify,
          })
        : connect({ host: credentials.host, port: credentials.port });

      const event = implicitTls ? 'secureConnect' : 'connect';
      const onError = (error: Error): void => {
        socket.destroy();
        reject(new SmtpError(error.message, 'CONNECT'));
      };

      socket.once('error', onError);
      if (implicitTls) {
        socket.setTimeout(security.timeoutMs, () => {
          onError(new Error('Connection timed out'));
        });
      }
      socket.once(event, () => {
        socket.removeListener('error', onError);
        socket.setTimeout(0);
        resolve(socket);
      });
    });
  }

  private static async wrap(
    socket: Socket,
    host: string,
    rejectUnauthorized: boolean,
  ): Promise<Socket> {
    return new Promise<Socket>((resolve, reject) => {
      const secured = tlsConnect({
        socket,
        servername: host,
        rejectUnauthorized,
      });
      const onError = (error: Error): void => {
        secured.destroy();
        reject(new SmtpError(error.message, 'STARTTLS'));
      };
      secured.once('error', onError);
      secured.once('secureConnect', () => {
        secured.removeListener('error', onError);
        resolve(secured instanceof TLSSocket ? secured : socket);
      });
    });
  }

  private attachListeners(): void {
    this.socket.setEncoding('utf8');
    this.socket.on('data', this.onData);
    this.socket.on('error', this.onError);
    this.socket.on('close', this.onClose);
  }

  private detachListeners(): void {
    this.socket.removeListener('data', this.onData);
    this.socket.removeListener('error', this.onError);
    this.socket.removeListener('close', this.onClose);
  }

  private readonly onData = (chunk: string): void => {
    this.buffer += chunk;
    this.settleIfComplete();
  };

  private readonly onError = (error: Error): void => {
    this.failPending(new SmtpError(error.message, 'SOCKET'));
  };

  private readonly onClose = (): void => {
    this.failPending(new SmtpError('Connection closed by server', 'SOCKET'));
  };

  private settleIfComplete(): void {
    if (this.waiter === null) {
      return;
    }
    const end = this.buffer.indexOf(CRLF);
    if (end < 0) {
      if (this.buffer.length > MAX_LINE_BYTES) {
        this.failPending(new SmtpError('Reply line too long', 'READ'));
      }
      return;
    }
    const line = this.buffer.slice(0, end + 2);
    if (!/^\d{3} /.test(line)) {
      return;
    }
    this.buffer = this.buffer.slice(end + 2);
    const waiter = this.waiter;
    this.waiter = null;
    waiter.resolve(parseReply(line));
  }

  private failPending(error: Error): void {
    const waiter = this.waiter;
    this.waiter = null;
    waiter?.reject(error);
  }

  private nextReply(command: string): Promise<SmtpReply> {
    return new Promise<SmtpReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failPending(new SmtpError('Timed out waiting for reply', command));
      }, this.timeoutMs);
      timer.unref();

      this.waiter = {
        resolve: (reply) => {
          clearTimeout(timer);
          resolve(reply);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      this.settleIfComplete();
    });
  }

  private write(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.socket.write(data, 'utf8', (error) => {
        if (error === null || error === undefined) {
          resolve();
        } else {
          reject(new SmtpError(error.message, 'WRITE'));
        }
      });
    });
  }
}

function parseReply(raw: string): SmtpReply {
  const lines = raw.split(CRLF).filter((line) => line.length > 0);
  const last = lines.at(-1) ?? '000 ';
  const code = Number.parseInt(last.slice(0, 3), 10);
  const text = lines
    .map((line) => line.slice(4))
    .join(' ')
    .trim();
  return { code, text, isFailure: code === 0 || code >= 400 };
}

/** Escapes leading dots as required by RFC 5321 section 4.5.2. */
export function dotStuff(raw: string): string {
  return raw.replace(/^\./gm, '..');
}
