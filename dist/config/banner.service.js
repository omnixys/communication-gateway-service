var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
var BannerService_1;
import { env } from './env.js';
import { Injectable } from '@nestjs/common';
import { displayLogEnvValue, getLogger, getLogEnvSection, LOG_ENV_SECTION_ORDER, } from '@omnixys/logger-ts';
import cFonts from 'cfonts';
import chalk from 'chalk';
import { release, type } from 'node:os';
import process from 'node:process';
let BannerService = BannerService_1 = class BannerService {
    #logger = getLogger(BannerService_1.name, 'class');
    onApplicationBootstrap() {
        cFonts.say(env.SERVICE, {
            font: 'block',
            align: 'left',
            gradient: ['white', 'black'],
            background: 'transparent',
            letterSpacing: 1,
            lineHeight: 1,
        });
        this.#logger.info(chalk.green('=== Anwendungsinformationen ==='));
        this.#logger.info(chalk.cyan('Anwendungsname: ') + chalk.yellow(env.SERVICE));
        this.#logger.info(chalk.cyan('Node.js-Version: ') + chalk.yellow(process.version));
        this.#logger.info(chalk.cyan('Umgebung: ') + chalk.yellow(env.NODE_ENV));
        this.#logger.info(chalk.cyan('Host: ') + chalk.yellow(env.HOST));
        this.#logger.info(chalk.cyan('Port: ') + chalk.yellow(String(env.PORT)));
        this.#logger.info(chalk.cyan('Betriebssystem: ') + chalk.yellow(`${type()} (${release()})`));
        const groups = new Map();
        for (const section of LOG_ENV_SECTION_ORDER) {
            groups.set(section, []);
        }
        for (const [key, value] of Object.entries(env)) {
            if (['SERVICE', 'NODE_ENV', 'HOST', 'PORT'].includes(key) || typeof value === 'object') {
                continue;
            }
            groups
                .get(getLogEnvSection(key))
                ?.push([key, displayLogEnvValue(key, value, { nodeEnv: 'production' })]);
        }
        for (const section of LOG_ENV_SECTION_ORDER) {
            const entries = groups.get(section);
            if (entries === undefined || entries.length === 0) {
                continue;
            }
            this.#logger.info(chalk.green(`==============${section}===========`));
            for (const [key, value] of entries) {
                this.#logger.info(chalk.cyan(`${key}: `) + chalk.yellow(value));
            }
        }
        this.#logger.info(chalk.green('==============================='));
    }
};
BannerService = BannerService_1 = __decorate([
    Injectable()
], BannerService);
export { BannerService };
