import { connect } from 'node:net';
import { connect as tlsConnect, TLSSocket } from 'node:tls';
import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('SmtpClient', 'class');
const CRLF = '\r\n';
const MAX_LINE_BYTES = 8192;
const IMPLICIT_TLS_PORT = 465;
export class SmtpError extends Error {
    command;
    constructor(message, command) {
        super(message);
        this.command = command;
        this.name = 'SmtpError';
    }
}
export class SmtpClient {
    credentials;
    security;
    tokenProvider;
    constructor(credentials, security, tokenProvider = null) {
        this.credentials = credentials;
        this.security = security;
        this.tokenProvider = tokenProvider;
    }
    async probe() {
        const session = await SmtpSession.open(this.credentials, this.security);
        try {
            await session.command('EHLO omnixys-communication-gateway');
            return true;
        }
        finally {
            await session.close();
        }
    }
    async send(envelope) {
        const session = await SmtpSession.open(this.credentials, this.security);
        try {
            let capabilities = await session.command('EHLO omnixys-communication-gateway');
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
        }
        catch (error) {
            logger.warn({
                host: this.credentials.host,
                command: error instanceof SmtpError ? error.command : 'UNKNOWN',
                error: error instanceof Error ? error.message : String(error),
            }, 'smtp session failed');
            await session.close();
            throw error;
        }
    }
    async maybeUpgrade(session, capabilities) {
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
    async authenticate(session, capabilities) {
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
            const initialResponse = Buffer.from(`\u0000${credentials.username}\u0000${credentials.password}`, 'utf8').toString('base64');
            await session.command(`AUTH PLAIN ${initialResponse}`);
            return;
        }
        throw new SmtpError('Server offers no supported auth mechanism', 'AUTH');
    }
    async authenticateLogin(session) {
        const { username, password } = this.credentials;
        const challenge = await session.command('AUTH LOGIN', {
            allowContinuation: true,
        });
        if (challenge.code !== 334) {
            throw new SmtpError('Server rejected AUTH LOGIN', 'AUTH LOGIN');
        }
        const userReply = await session.command(Buffer.from(username, 'utf8').toString('base64'), { allowContinuation: true });
        if (userReply.code !== 334) {
            throw new SmtpError(userReply.text, 'AUTH LOGIN');
        }
        await session.command(Buffer.from(password, 'utf8').toString('base64'));
    }
    async authenticateOauthBearer(session) {
        const { username } = this.credentials;
        const token = await this.oauthToken();
        const initialResponse = Buffer.from(`user=${username}\u0001auth=Bearer ${token}\u0001\u0001`, 'utf8').toString('base64');
        try {
            await session.command(`AUTH XOAUTH2 ${initialResponse}`, {
                expectAuthOutcome: true,
            });
        }
        catch (error) {
            throw new SmtpError(error instanceof Error ? error.message : String(error), 'AUTH XOAUTH2');
        }
    }
    async oauthToken() {
        if (this.tokenProvider === null) {
            throw new SmtpError('No OAuth2 token provider configured', 'AUTH XOAUTH2');
        }
        return this.tokenProvider();
    }
}
class SmtpSession {
    socket;
    timeoutMs;
    buffer = '';
    waiter = null;
    constructor(socket, timeoutMs) {
        this.socket = socket;
        this.timeoutMs = timeoutMs;
    }
    static async open(credentials, security) {
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
    async command(line, options = {}) {
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
    async writeBody(body) {
        await this.write(`${body}${CRLF}.${CRLF}`);
        const reply = await this.nextReply('DATA');
        if (reply.isFailure) {
            throw new SmtpError(reply.text, 'DATA');
        }
    }
    async upgrade(host, rejectUnauthorized) {
        this.detachListeners();
        this.buffer = '';
        this.socket = await SmtpSession.wrap(this.socket, host, rejectUnauthorized);
        this.attachListeners();
    }
    async close() {
        this.detachListeners();
        this.socket.destroy();
    }
    static async connect(credentials, security) {
        const implicitTls = security.tlsEnabled && credentials.port === IMPLICIT_TLS_PORT;
        return new Promise((resolve, reject) => {
            const socket = implicitTls
                ? tlsConnect({
                    host: credentials.host,
                    port: credentials.port,
                    servername: credentials.host,
                    rejectUnauthorized: security.tlsVerify,
                })
                : connect({ host: credentials.host, port: credentials.port });
            const event = implicitTls ? 'secureConnect' : 'connect';
            const onError = (error) => {
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
    static async wrap(socket, host, rejectUnauthorized) {
        return new Promise((resolve, reject) => {
            const secured = tlsConnect({
                socket,
                servername: host,
                rejectUnauthorized,
            });
            const onError = (error) => {
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
    attachListeners() {
        this.socket.setEncoding('utf8');
        this.socket.on('data', this.onData);
        this.socket.on('error', this.onError);
        this.socket.on('close', this.onClose);
    }
    detachListeners() {
        this.socket.removeListener('data', this.onData);
        this.socket.removeListener('error', this.onError);
        this.socket.removeListener('close', this.onClose);
    }
    onData = (chunk) => {
        this.buffer += chunk;
        this.settleIfComplete();
    };
    onError = (error) => {
        this.failPending(new SmtpError(error.message, 'SOCKET'));
    };
    onClose = () => {
        this.failPending(new SmtpError('Connection closed by server', 'SOCKET'));
    };
    settleIfComplete() {
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
    failPending(error) {
        const waiter = this.waiter;
        this.waiter = null;
        waiter?.reject(error);
    }
    nextReply(command) {
        return new Promise((resolve, reject) => {
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
    write(data) {
        return new Promise((resolve, reject) => {
            this.socket.write(data, 'utf8', (error) => {
                if (error === null || error === undefined) {
                    resolve();
                }
                else {
                    reject(new SmtpError(error.message, 'WRITE'));
                }
            });
        });
    }
}
function parseReply(raw) {
    const lines = raw.split(CRLF).filter((line) => line.length > 0);
    const last = lines.at(-1) ?? '000 ';
    const code = Number.parseInt(last.slice(0, 3), 10);
    const text = lines
        .map((line) => line.slice(4))
        .join(' ')
        .trim();
    return { code, text, isFailure: code === 0 || code >= 400 };
}
export function dotStuff(raw) {
    return raw.replace(/^\./gm, '..');
}
